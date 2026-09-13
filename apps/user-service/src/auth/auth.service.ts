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
import { UserRole } from '@dedisalam/common';

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
    } catch (err: any) {
      this.logger.error(`Bootstrap superadmin check failed: ${err.message}`, err.stack);
    }
  }

  async register(data: any) {
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
      isActive: (newUser as any).isActive ?? true,
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

  async login(data: any) {
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

  async refresh(data: any) {
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

  async logout(data: any) {
    const { refreshToken, accessToken, userId } = data;

    if (accessToken) {
      const decoded: any = jwt.decode(accessToken);
      if (decoded && decoded.exp) {
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

  async updateProfile(data: any) {
    const { userId, name, password } = data;
    if (!userId) throw new BadRequestException('userId is required');

    const updateData: any = {};
    if (name) updateData.name = name;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(userId, updateData, { new: true });
    if (!updatedUser) throw new BadRequestException('User not found');

    const changes: any = {};
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

  async createUser(data: any) {
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
      createdAt: (newUser as any).createdAt,
    };
  }

  async getUsersPaginated(query: any) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const filter: any = {};

    if (query.search && typeof query.search === 'string' && query.search.trim()) {
      const searchRegex = { $regex: query.search.trim(), $options: 'i' };
      filter.$or = [{ name: searchRegex }, { email: searchRegex }];
    }

    if (query.role && typeof query.role === 'string') {
      filter.role = query.role;
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
        createdAt: (u as any).createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async updateUserByAdmin(userId: string, data: any) {
    if (!userId) throw new BadRequestException('userId is required');

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.role) updateData.role = data.role;
    if (typeof data.isActive === 'boolean') updateData.isActive = data.isActive;
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(userId, updateData, { new: true });
    if (!updatedUser) throw new BadRequestException('User not found');

    const changes: any = {};
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
      updatedAt: (updatedUser as any).updatedAt,
    };
  }

  async deleteUser(userId: string) {
    if (!userId) throw new BadRequestException('userId is required');

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
}
