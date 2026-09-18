import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
  OnApplicationBootstrap,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';
import { User, UserDocument, RedisService } from '@dedisalam/database';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import {
  AdminCreateUserDto,
  JwtPayload,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  UserPaginationQueryDto,
  UserRole,
} from '@dedisalam/common';

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret: string;

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    @Inject('NOTIFICATION_SERVICE_RMQ') private readonly notificationClient: ClientProxy,
  ) {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('FATAL: JWT_SECRET environment variable is not defined');
    }
    this.jwtSecret = secret;
  }

  async onApplicationBootstrap() {
    try {
      const superAdminCount = await this.userModel.countDocuments({
        role: UserRole.SUPER_ADMIN,
      });

      if (superAdminCount === 0) {
        const defaultEmail =
          this.configService.get<string>('DEFAULT_SUPERADMIN_EMAIL') || 'superadmin@example.com';
        const defaultPassword =
          this.configService.get<string>('DEFAULT_SUPERADMIN_PASSWORD') || 'Admin123!';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        await this.userModel.create({
          name: 'Super Administrator',
          email: defaultEmail,
          password: hashedPassword,
          role: UserRole.SUPER_ADMIN,
          isActive: true,
        });

        this.logger.log(
          `🚀 Bootstrap: Default superadmin initialized successfully (${defaultEmail})`,
        );
      }
    } catch (err: unknown) {
      const errMsg = (err as Error).message;
      const errStack = (err as Error).stack;
      this.logger.error(`Bootstrap superadmin check failed: ${errMsg}`, errStack);
    }
  }

  async register(
    data: RegisterDto | { email: string; password: string; name: string; role?: string },
  ) {
    const { email, password, name } = data;
    if (!email || !password || !name) {
      throw new BadRequestException('Email, password, and name are required');
    }

    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await this.userModel.create({
      email,
      name,
      password: hashedPassword,
      role: data.role || 'user',
    });

    const userPayload = {
      id: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      isActive: (newUser as unknown as { isActive?: boolean }).isActive ?? true,
    };
    const timestamp = new Date().toISOString();

    this.notificationClient.emit('user.created', {
      userId: newUser._id.toString(),
      name: newUser.name,
      user: userPayload,
      timestamp,
    });

    return {
      message: 'User registered successfully',
      user: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
      },
    };
  }

  async login(data: LoginDto | { email: string; password: string }) {
    const { email, password } = data;
    const user = await this.userModel.findOne({ email }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = jwt.sign(
      { sub: user._id, email: user.email, role: user.role, roles: [user.role] },
      this.jwtSecret,
      { expiresIn: '15m' },
    );

    const refreshToken = randomBytes(40).toString('hex');
    const hashedRefreshToken = createHash('sha256').update(refreshToken).digest('hex');
    // Store hashed refresh token in Redis for 7 days
    await this.redisService.set(`refresh_token:${user._id}`, hashedRefreshToken, 7 * 24 * 60 * 60);

    this.notificationClient.emit('user.logged_in', {
      userId: user._id,
      email: user.email,
      name: user.name,
      timestamp: new Date().toISOString(),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async refresh(data: RefreshTokenDto | { userId: string; refreshToken: string }) {
    const { userId, refreshToken } = data;
    if (!userId || !refreshToken) {
      throw new UnauthorizedException('Missing refresh token or userId');
    }

    const storedHashedToken = await this.redisService.get(`refresh_token:${userId}`);
    const incomingHashedToken = createHash('sha256').update(refreshToken).digest('hex');

    if (!storedHashedToken || storedHashedToken !== incomingHashedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Rotate refresh token
    const newRefreshToken = randomBytes(40).toString('hex');
    const newHashedRefreshToken = createHash('sha256').update(newRefreshToken).digest('hex');
    await this.redisService.set(`refresh_token:${userId}`, newHashedRefreshToken, 7 * 24 * 60 * 60);

    const accessToken = jwt.sign(
      { sub: user._id, email: user.email, role: user.role, roles: [user.role] },
      this.jwtSecret,
      { expiresIn: '15m' },
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new BadRequestException('User not found');
    return {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    };
  }

  async getAllUsers() {
    const users = await this.userModel.find();
    return users.map((user) => ({
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    }));
  }

  async logout(data: { refreshToken?: string; accessToken?: string; userId?: string }) {
    const { accessToken, userId } = data;

    if (accessToken) {
      const decoded = jwt.decode(accessToken) as JwtPayload | null;
      if (decoded && typeof decoded.exp === 'number') {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await this.redisService.set(`blacklist:${accessToken}`, 'true', ttl);
        }
      }
    }

    if (userId) {
      // Assuming redisService has a del method. If not, setting it with 0 ttl or empty is an alternative.
      // We will try set with 1 second if del fails, but typically del is available.
      await this.redisService.set(`refresh_token:${userId}`, '', 1);
    }

    return { message: 'Logged out successfully' };
  }

  async updateProfile(data: { userId?: string; name?: string; password?: string }) {
    const { userId, name, password } = data;
    if (!userId) throw new BadRequestException('userId is required');

    const updateData: { name?: string; password?: string } = {};
    if (name) updateData.name = name;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(userId, updateData, { new: true });
    if (!updatedUser) throw new BadRequestException('User not found');

    const changes: { name?: string } = {};
    if (name) changes.name = name;

    this.notificationClient.emit('user.updated', {
      userId,
      changes,
      timestamp: new Date().toISOString(),
    });

    return {
      id: updatedUser._id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
    };
  }

  async createUser(
    data:
      | AdminCreateUserDto
      | { email: string; password: string; name: string; role?: UserRole | string },
  ) {
    const { email, password, name, role } = data;
    if (!email || !password || !name) {
      throw new BadRequestException('Email, password, and name are required');
    }

    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await this.userModel.create({
      email,
      name,
      password: hashedPassword,
      role: role || 'user',
      isActive: true,
    });

    const userPayload = {
      id: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      isActive: newUser.isActive,
    };
    const timestamp = new Date().toISOString();

    this.notificationClient.emit('user.created', {
      userId: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      user: userPayload,
      timestamp,
    });

    return {
      id: newUser._id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      isActive: newUser.isActive,
      createdAt: (newUser as unknown as { createdAt?: Date }).createdAt,
    };
  }

  async getUsersPaginated(
    query:
      | UserPaginationQueryDto
      | {
          page?: number | string;
          limit?: number | string;
          search?: string;
          role?: string;
          [key: string]: unknown;
        },
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const filter: Record<string, unknown> = {};

    if (query.search && typeof query.search === 'string' && query.search.trim()) {
      const searchRegex = { $regex: query.search.trim(), $options: 'i' };
      filter['$or'] = [{ name: searchRegex }, { email: searchRegex }];
    }

    if (query.role && typeof query.role === 'string') {
      filter['role'] = query.role;
    }

    const total = await this.userModel.countDocuments(filter);
    const users = await this.userModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return {
      items: users.map((u) => ({
        id: u._id,
        email: u.email,
        name: u.name,
        role: u.role,
        isActive: u.isActive,
        createdAt: (u as unknown as { createdAt?: Date }).createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async updateUserByAdmin(
    userId: string,
    data: { name?: string; role?: UserRole | string; isActive?: boolean; password?: string },
  ) {
    if (!userId) throw new BadRequestException('userId is required');

    const updateData: {
      name?: string;
      role?: UserRole | string;
      isActive?: boolean;
      password?: string;
    } = {};
    if (data.name) updateData.name = data.name;
    if (data.role) updateData.role = data.role;
    if (typeof data.isActive === 'boolean') updateData.isActive = data.isActive;
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(userId, updateData, { new: true });
    if (!updatedUser) throw new BadRequestException('User not found');

    const changes: { name?: string; role?: UserRole | string; isActive?: boolean } = {};
    if (data.name !== undefined) changes.name = data.name;
    if (data.role !== undefined) changes.role = data.role;
    if (typeof data.isActive === 'boolean') changes.isActive = data.isActive;

    this.notificationClient.emit('user.updated', {
      userId,
      changes,
      timestamp: new Date().toISOString(),
    });

    return {
      id: updatedUser._id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
      updatedAt: (updatedUser as unknown as { updatedAt?: Date }).updatedAt,
    };
  }

  async deleteUser(userId: string) {
    if (!userId) throw new BadRequestException('userId is required');

    const user = await this.userModel.findById(userId);
    if (!user) throw new BadRequestException('User not found');

    if (user.role === 'super_admin' || user.email === 'superadmin@example.com') {
      throw new BadRequestException('Cannot delete superadmin user');
    }

    const deleted = await this.userModel.findByIdAndDelete(userId);
    if (!deleted) throw new BadRequestException('User not found');

    // Invalidate refresh tokens in Redis
    await this.redisService.set(`refresh_token:${userId}`, '', 1);

    this.notificationClient.emit('user.deleted', {
      userId,
      timestamp: new Date().toISOString(),
    });

    return {
      message: 'User deleted successfully',
      userId,
    };
  }

  async deleteUsers(userIds: string[]) {
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new BadRequestException('userIds array is required and cannot be empty');
    }

    const usersToEvaluate = await this.userModel.find({ _id: { $in: userIds } });
    const validUserIds = usersToEvaluate
      .filter((u) => u.role !== 'super_admin' && u.email !== 'superadmin@example.com')
      .map((u) => u._id);

    if (validUserIds.length === 0) {
      throw new BadRequestException('No valid users to delete or cannot delete superadmin users');
    }

    const result = await this.userModel.deleteMany({ _id: { $in: validUserIds } });

    for (const id of validUserIds) {
      await this.redisService.set(`refresh_token:${id.toString()}`, '', 1);
    }

    this.notificationClient.emit('users.deletedMany', {
      userIds: validUserIds,
      timestamp: new Date().toISOString(),
    });

    return {
      message: 'Users deleted successfully',
      deletedCount: result.deletedCount,
      userIds: validUserIds,
    };
  }
}
