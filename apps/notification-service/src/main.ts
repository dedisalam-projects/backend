import { AppModule } from './app/app.module';
import { bootstrapMicroservice } from '@dedisalam/common';

bootstrapMicroservice({
  module: AppModule,
  serviceName: 'Notification Service',
  defaultPort: 3012,
  portEnvKey: 'NOTIFICATION_SERVICE_PORT',
  queueName: 'notification-service',
  queueOptions: {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': 'notification-service.dlx',
      'x-dead-letter-routing-key': 'notification-service.dlq',
    },
  },
});
