import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AppService {
  constructor(@Inject('USER_SERVICE') private readonly userClient: ClientProxy) {}

  async getHello() {
    try {
      const payload = { message: 'Hello from API Gateway', correlationId: 'gateway-hello-id' };
      const result = await firstValueFrom(this.userClient.send('user.hello', payload));

      // Trigger Step 4 E2E Event Flow (fire-and-forget TCP event)
      this.userClient.emit('test.event', {
        message: 'Event flow test message',
        correlationId: 'gateway-hello-id',
      });

      return {
        message: 'Hello World',
        services: {
          user: result ? 'ok' : 'error',
        },
      };
    } catch {
      return {
        message: 'Hello World',
        services: {
          user: 'error',
        },
      };
    }
  }
}
