import { Injectable, UnauthorizedException, BadRequestException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';
import { User, UserDocument, RedisService } from '@dedisalam/database';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class AuthService {
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
    });

    this.notificationClient.emit('user.created', { userId: newUser._id, name: newUser.name });

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
      { sub: user._id, email: user.email, role: user.role },
      this.jwtSecret,
      { expiresIn: '15m' },
    );

    const refreshToken = randomBytes(40).toString('hex');
    const hashedRefreshToken = createHash('sha256').update(refreshToken).digest('hex');
    // Store hashed refresh token in Redis for 7 days
    await this.redisService.set(`refresh_token:${user._id}`, hashedRefreshToken, 7 * 24 * 60 * 60);

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
      { sub: user._id, email: user.email, role: user.role },
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

    return {
      id: updatedUser._id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
    };
  }
}
