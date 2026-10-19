import { AppModule } from './app/app.module';
import { bootstrapMicroservice } from '@dedisalam/common';

bootstrapMicroservice({
  module: AppModule,
  serviceName: 'Auth Service',
  defaultPort: 3015,
  portEnvKey: 'AUTH_SERVICE_PORT',
  queueName: 'auth-service',
});
