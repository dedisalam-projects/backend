import { AppModule } from './app/app.module';
import { bootstrapMicroservice } from '@dedisalam/common';

bootstrapMicroservice({
  module: AppModule,
  serviceName: 'Blip Services',
  defaultPort: 3013,
  portEnvKey: 'BLIP_SERVICES_PORT',
  queueName: 'blip-services',
});
