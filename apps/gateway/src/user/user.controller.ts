import { Controller, Get, Req, Inject, Logger, UseGuards, Patch, Body } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Roles, RolesGuard } from '@dedisalam/common';
import { firstValueFrom, timeout } from 'rxjs';

@Controller('api/v1/users')
@UseGuards(RolesGuard)
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(@Inject('USER_SERVICE') private readonly userService: ClientProxy) {}

  @Get('me')
  async getProfile(@Req() req: any) {
    const userId = req.user.sub;
    try {
      const response = await firstValueFrom(
        this.userService.send('user.profile', { userId }).pipe(timeout(5000)),
      );
      return response;
    } catch (error) {
      this.logger.error('Error fetching profile', error);
      throw error;
    }
  }

  @Patch('me')
  async updateProfile(@Req() req: any, @Body() body: any) {
    const userId = req.user.sub;
    try {
      const response = await firstValueFrom(
        this.userService.send('user.update', { userId, ...body }).pipe(timeout(5000)),
      );
      return response;
    } catch (error) {
      this.logger.error('Error updating profile', error);
      throw error;
    }
  }

  @Get()
  @Roles('admin', 'super_admin')
  async getAllUsers() {
    try {
      const response = await firstValueFrom(
        this.userService.send('user.list', {}).pipe(timeout(5000)),
      );
      return response;
    } catch (error) {
      this.logger.error('Error fetching users', error);
      throw error;
    }
  }
}
