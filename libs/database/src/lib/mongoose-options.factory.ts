import { ConfigService } from '@nestjs/config';
import { MongooseModuleOptions } from '@nestjs/mongoose';

/**
 * Creates a Mongoose connection options factory for use with
 * `MongooseModule.forRootAsync({ useFactory: mongooseOptionsFactory('my_db') })`.
 *
 * Reads `MONGODB_URI` from the environment via `ConfigService`.
 * Throws a descriptive error at startup if the URI is not configured.
 *
 * @param dbName - The MongoDB database name for this service.
 */
export function createMongooseOptions(
  dbName: string,
): (configService: ConfigService) => MongooseModuleOptions {
  return (configService: ConfigService): MongooseModuleOptions => {
    const uri = configService.get<string>('MONGODB_URI');

    if (!uri) {
      throw new Error('MongoDB URI is not configured. Set MONGODB_URI.');
    }

    return { uri, dbName };
  };
}
