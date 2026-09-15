import {
  Controller,
  Get,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Inject,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { JwtAuthGuard, RolesGuard, Roles, UserPaginationQueryDto } from '@dedisalam/common';

@Controller('api/v1/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(@Inject('USER_SERVICE') private readonly userService: ClientProxy) {}

  @Get()
  async getUsers(@Query() query: UserPaginationQueryDto) {
    try {
      this.logger.log(`Handling GET /api/v1/users with query: ${JSON.stringify(query)}`);
      const response = await firstValueFrom(
        this.userService.send('user.list.paginated', query || {}).pipe(timeout(5000)),
      );

      return {
        success: true,
        data: response,
        meta: { timestamp: new Date().toISOString() },
      };
    } catch (error: any) {
      this.logger.error(`Error in getUsers: ${error?.message}`, error?.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error?.message || 'Internal Server Error',
        error?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
