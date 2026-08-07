import {
  Controller,
  Post,
  Body,
  Inject,
  Logger,
  HttpException,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Public, LoginDto, RegisterDto, RefreshTokenDto } from '@dedisalam/common';
import { firstValueFrom, timeout } from 'rxjs';

@Controller('api/v1/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(@Inject('USER_SERVICE') private readonly userService: ClientProxy) {}

  @Public()
  @Post('login')
  async login(@Body() body: LoginDto) {
    try {
      const response = await firstValueFrom(
        this.userService.send('auth.login', body).pipe(timeout(5000)),
      );
      return response;
    } catch (error: any) {
      this.logger.error('Error in login', error);
      throw new HttpException(
        error.message || 'Internal Server Error',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @Post('register')
  async register(@Body() body: RegisterDto) {
    try {
      const response = await firstValueFrom(
        this.userService.send('auth.register', body).pipe(timeout(5000)),
      );
      return response;
    } catch (error: any) {
      this.logger.error('Error in register', error);
      throw new HttpException(
        error.message || 'Internal Server Error',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() body: RefreshTokenDto) {
    try {
      const response = await firstValueFrom(
        this.userService.send('auth.refresh', body).pipe(timeout(5000)),
      );
      return response;
    } catch (error: any) {
      this.logger.error('Error in refresh', error);
      throw new HttpException(
        error.message || 'Internal Server Error',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('logout')
  async logout(@Req() req: any, @Body() body: any) {
    try {
      const accessToken = req.headers.authorization?.split(' ')[1];
      const response = await firstValueFrom(
        this.userService
          .send('auth.logout', {
            refreshToken: body.refreshToken,
            accessToken,
            userId: req.user?.sub,
          })
          .pipe(timeout(5000)),
      );
      return response;
    } catch (error: any) {
      this.logger.error('Error in logout', error);
      throw new HttpException(
        error.message || 'Internal Server Error',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
