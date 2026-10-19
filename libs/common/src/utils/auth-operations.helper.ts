import {
  BadRequestException,
  UnauthorizedException,
  Logger,
  Injectable,
  OnApplicationBootstrap,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'node:crypto';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { LoginDto, RegisterDto, RefreshTokenDto } from '../dto';
import { UserRole } from '../constants';

export interface AuthContext {
  userModel: Model<any>;
  redisService: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string, ttlSeconds?: number) => Promise<any>;
    del?: (key: string) => Promise<any>;
  };
  jwtSecret: string;
  notificationClient?: ClientProxy;
  logger: Logger;
}

@Injectable()
export abstract class BaseAuthService implements OnApplicationBootstrap {
  protected readonly logger: Logger;
  protected readonly jwtSecret: string;
  protected readonly authCtx: AuthContext;

  constructor(
    protected readonly userModel: Model<any>,
    protected readonly redisService: any,
    protected readonly configService: ConfigService,
    protected readonly notificationClient?: ClientProxy,
    loggerContext = 'BaseAuthService',
  ) {
    this.logger = new Logger(loggerContext);
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('FATAL: JWT_SECRET environment variable is not defined');
    }
    this.jwtSecret = secret;
    this.authCtx = {
      userModel: this.userModel,
      redisService: this.redisService,
      jwtSecret: this.jwtSecret,
      notificationClient: this.notificationClient,
      logger: this.logger,
    };
  }

  async onApplicationBootstrap() {
    await bootstrapSuperAdmin(this.userModel, this.configService, this.logger);
  }

  async register(
    data: RegisterDto | { email: string; password: string; name: string; role?: string },
  ) {
    return executeUserRegister(this.authCtx, data);
  }

  async login(data: LoginDto | { email: string; password: string }) {
    return executeUserLogin(this.authCtx, data);
  }

  async refresh(data: RefreshTokenDto | { userId: string; refreshToken: string }) {
    return executeTokenRefresh(this.authCtx, data);
  }
}

export async function bootstrapSuperAdmin(
  userModel: Model<any>,
  configService: ConfigService,
  logger: Logger,
): Promise<void> {
  try {
    const superAdminCount = await userModel.countDocuments({
      role: UserRole.SUPER_ADMIN,
    });

    if (superAdminCount === 0) {
      const defaultEmail =
        configService.get<string>('DEFAULT_SUPERADMIN_EMAIL') || 'superadmin@example.com';
      const defaultPassword =
        configService.get<string>('DEFAULT_SUPERADMIN_PASSWORD') || 'Admin123!';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      await userModel.create({
        name: 'Super Administrator',
        email: defaultEmail,
        password: hashedPassword,
        role: UserRole.SUPER_ADMIN,
        isActive: true,
      });

      logger.log(`🚀 Bootstrap: Default superadmin initialized successfully (${defaultEmail})`);
    }
  } catch (err: unknown) {
    const errMsg = (err as Error).message;
    const errStack = (err as Error).stack;
    logger.error(`Bootstrap superadmin check failed: ${errMsg}`, errStack);
  }
}

export async function executeUserRegister(
  ctx: AuthContext,
  data: RegisterDto | { email: string; password: string; name: string; role?: string },
) {
  const { email, password, name } = data;
  if (!email || !password || !name) {
    throw new BadRequestException('Email, password, and name are required');
  }

  const existingUser = await ctx.userModel.findOne({ email });
  if (existingUser) {
    throw new BadRequestException('User already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await ctx.userModel.create({
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

  if (ctx.notificationClient) {
    try {
      ctx.notificationClient.emit('user.created', {
        userId: newUser._id.toString(),
        name: newUser.name,
        user: userPayload,
        timestamp,
      });
    } catch (err: any) {
      ctx.logger.warn(`Failed to emit user.created notification: ${err.message}`);
    }
  }

  return {
    message: 'User registered successfully',
    user: {
      id: newUser._id,
      email: newUser.email,
      name: newUser.name,
    },
  };
}

export async function executeUserLogin(
  ctx: AuthContext,
  data: LoginDto | { email: string; password: string },
) {
  const { email, password } = data;
  const user = await ctx.userModel.findOne({ email }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new UnauthorizedException('Invalid credentials');
  }

  const accessToken = jwt.sign(
    { sub: user._id, email: user.email, role: user.role, roles: [user.role] },
    ctx.jwtSecret,
    { expiresIn: '15m' },
  );

  const refreshToken = randomBytes(40).toString('hex');
  const hashedRefreshToken = createHash('sha256').update(refreshToken).digest('hex');
  await ctx.redisService.set(`refresh_token:${user._id}`, hashedRefreshToken, 7 * 24 * 60 * 60);

  if (ctx.notificationClient) {
    try {
      ctx.notificationClient.emit('user.logged_in', {
        userId: user._id,
        email: user.email,
        name: user.name,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      ctx.logger.warn(`Failed to emit user.logged_in notification: ${err.message}`);
    }
  }

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

export async function executeTokenRefresh(
  ctx: AuthContext,
  data: RefreshTokenDto | { userId: string; refreshToken: string },
) {
  const { userId, refreshToken } = data;
  if (!userId || !refreshToken) {
    throw new UnauthorizedException('Missing refresh token or userId');
  }

  const storedHashedToken = await ctx.redisService.get(`refresh_token:${userId}`);
  const incomingHashedToken = createHash('sha256').update(refreshToken).digest('hex');

  if (!storedHashedToken || storedHashedToken !== incomingHashedToken) {
    throw new UnauthorizedException('Invalid refresh token');
  }

  const user = await ctx.userModel.findById(userId);
  if (!user) {
    throw new UnauthorizedException('User not found');
  }

  const newRefreshToken = randomBytes(40).toString('hex');
  const newHashedRefreshToken = createHash('sha256').update(newRefreshToken).digest('hex');
  await ctx.redisService.set(`refresh_token:${userId}`, newHashedRefreshToken, 7 * 24 * 60 * 60);

  const accessToken = jwt.sign(
    { sub: user._id, email: user.email, role: user.role, roles: [user.role] },
    ctx.jwtSecret,
    { expiresIn: '15m' },
  );

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
}
