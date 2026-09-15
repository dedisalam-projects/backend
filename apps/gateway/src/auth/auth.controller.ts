import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  Inject,
  Logger,
  HttpException,
  HttpStatus,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout } from 'rxjs';
import * as jwt from 'jsonwebtoken';
import { LoginDto, RegisterDto, RefreshTokenDto, Public } from '@dedisalam/common';

@Controller('api/v1/auth')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    @Inject('USER_SERVICE') private readonly userService: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  private getCookieOptions(path: string, maxAge?: number) {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const cookieDomain = isProduction
      ? this.configService.get<string>('COOKIE_DOMAIN') || '.dedisalam.my.id'
      : undefined;

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      domain: cookieDomain,
      path,
      ...(maxAge !== undefined ? { maxAge } : {}),
    };
  }

  private getRefreshCookiePath(): string {
    return this.configService.get<string>('REFRESH_COOKIE_PATH') || '/api/v1/auth';
  }

  private handleError(error: any, operation: string): never {
    this.logger.error(`Error in ${operation}: ${error?.message}`, error?.stack);
    if (error instanceof HttpException) {
      throw error;
    }
    throw new HttpException(
      error?.message || 'Internal Server Error',
      error?.status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  @Public()
  @Post('login')
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    try {
      this.logger.log(`Handling POST login for email: ${body.email}`);
      const response = await firstValueFrom(
        this.userService.send('auth.login', body).pipe(timeout(5000)),
      );

      const accessToken = response?.accessToken;
      const refreshToken = response?.refreshToken;
      const refreshPath = this.getRefreshCookiePath();

      if (accessToken) {
        res.cookie('accessToken', accessToken, this.getCookieOptions('/', 15 * 60 * 1000));
      }
      if (refreshToken) {
        res.cookie(
          'refreshToken',
          refreshToken,
          this.getCookieOptions(refreshPath, 7 * 24 * 60 * 60 * 1000),
        );
      }

      return {
        success: true,
        data: response,
        message: 'Login successful',
        meta: { timestamp: new Date().toISOString() },
      };
    } catch (error: any) {
      this.handleError(error, 'login');
    }
  }

  @Public()
  @Post('register')
  async register(@Body() body: RegisterDto) {
    try {
      this.logger.log(`Handling POST register for email: ${body.email}`);
      const response = await firstValueFrom(
        this.userService.send('auth.register', body).pipe(timeout(5000)),
      );

      return {
        success: true,
        data: response,
        message: 'User registered successfully',
        meta: { timestamp: new Date().toISOString() },
      };
    } catch (error: any) {
      this.handleError(error, 'register');
    }
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Body() body: Partial<RefreshTokenDto>,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const refreshToken = req.cookies?.refreshToken || body.refreshToken;
      let userId = body.userId;

      if (!userId) {
        const accessToken =
          req.cookies?.accessToken || req.headers.authorization?.replace(/^Bearer\s+/i, '');
        if (accessToken) {
          const decoded: any = jwt.decode(accessToken);
          userId = decoded?.sub || decoded?.userId;
        }
      }

      if (!refreshToken || !userId) {
        throw new UnauthorizedException('Missing refresh token or userId');
      }

      this.logger.log(`Handling POST refresh for userId: ${userId}`);
      const response = await firstValueFrom(
        this.userService.send('auth.refresh', { userId, refreshToken }).pipe(timeout(5000)),
      );

      const newAccessToken = response?.accessToken;
      const newRefreshToken = response?.refreshToken;
      const refreshPath = this.getRefreshCookiePath();

      if (newAccessToken) {
        res.cookie('accessToken', newAccessToken, this.getCookieOptions('/', 15 * 60 * 1000));
      }
      if (newRefreshToken) {
        res.cookie(
          'refreshToken',
          newRefreshToken,
          this.getCookieOptions(refreshPath, 7 * 24 * 60 * 60 * 1000),
        );
      }

      return {
        success: true,
        data: response,
        message: 'Token refreshed successfully',
        meta: { timestamp: new Date().toISOString() },
      };
    } catch (error: any) {
      this.handleError(error, 'refresh');
    }
  }

  @Public()
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Body() body: { refreshToken?: string; accessToken?: string; userId?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const refreshToken = req.cookies?.refreshToken || body.refreshToken || '';
      const accessToken =
        req.cookies?.accessToken ||
        req.headers.authorization?.replace(/^Bearer\s+/i, '') ||
        body.accessToken;
      let userId = body.userId;

      if (!userId && accessToken) {
        const decoded: any = jwt.decode(accessToken);
        userId = decoded?.sub || decoded?.userId;
      }

      this.logger.log(`Handling POST logout`);
      const response = await firstValueFrom(
        this.userService
          .send('auth.logout', { refreshToken, accessToken, userId })
          .pipe(timeout(5000)),
      );

      const refreshPath = this.getRefreshCookiePath();
      res.clearCookie('accessToken', this.getCookieOptions('/'));
      res.clearCookie('refreshToken', this.getCookieOptions(refreshPath));
      res.clearCookie('refreshToken', this.getCookieOptions('/api/v1/auth/refresh'));
      res.clearCookie('refreshToken', this.getCookieOptions('/'));

      return {
        success: true,
        data: response,
        message: 'Logged out successfully',
        meta: { timestamp: new Date().toISOString() },
      };
    } catch (error: any) {
      this.handleError(error, 'logout');
    }
  }
}
