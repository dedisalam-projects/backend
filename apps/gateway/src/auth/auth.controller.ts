import { Controller, Post, Body, Inject, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Public } from '@dedisalam/common';
import { firstValueFrom, timeout } from 'rxjs';

@Controller('api/v1/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(@Inject('USER_SERVICE') private readonly userService: ClientProxy) {}

  @Public()
  @Post('login')
  async login(@Body() body: any) {
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
  async register(@Body() body: any) {
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
  async refresh(@Body() body: any) {
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
}
