import { AppModule } from './app/app.module';
import { bootstrapMicroservice } from '@dedisalam/common';

bootstrapMicroservice({
  module: AppModule,
  serviceName: 'User Service',
  defaultPort: 3011,
  portEnvKey: 'USER_SERVICE_PORT',
  queueName: 'user-service',
});
