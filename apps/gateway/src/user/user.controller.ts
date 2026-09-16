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
    } catch (error: unknown) {
      const err = error as {
        message?: string | string[];
        statusCode?: number;
        status?: number;
        stack?: string;
      };
      this.logger.error(`Error in getUsers: ${err?.message}`, err?.stack);
      if (error instanceof HttpException) {
        throw error;
      }

      const numericStatus =
        typeof err?.statusCode === 'number'
          ? err.statusCode
          : typeof err?.status === 'number'
            ? err.status
            : HttpStatus.INTERNAL_SERVER_ERROR;

      const message =
        typeof err?.message === 'string'
          ? err.message
          : Array.isArray(err?.message)
            ? err.message.join(', ')
            : 'Internal Server Error';

      throw new HttpException(message, numericStatus);
    }
  }
}
