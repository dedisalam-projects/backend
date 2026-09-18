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
      if (error instanceof HttpException) {
        this.logger.error(`Error in getUsers: ${error.message}`, error.stack);
        throw error;
      }

      const err = (error || {}) as any;
      const statusCandidate = err.statusCode ?? err.status;
      const numericStatus =
        typeof statusCandidate === 'number' ? statusCandidate : HttpStatus.INTERNAL_SERVER_ERROR;

      const message = Array.isArray(err.message)
        ? err.message.join(', ')
        : typeof err.message === 'string'
          ? err.message
          : 'Internal Server Error';

      this.logger.error(`Error in getUsers: ${message}`, err.stack);

      throw new HttpException(message, numericStatus);
    }
  }
}
