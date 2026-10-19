import { ConfigService } from '@nestjs/config';
import { createMongooseOptions } from './mongoose-options.factory';

describe('createMongooseOptions', () => {
  it('should return MongooseModuleOptions with uri and dbName when MONGODB_URI is set', () => {
    const configService = {
      get: jest.fn().mockReturnValue('mongodb://localhost:27017'),
    } as unknown as ConfigService;

    const factory = createMongooseOptions('test_db');
    const options = factory(configService);

    expect(options).toEqual({
      uri: 'mongodb://localhost:27017',
      dbName: 'test_db',
    });
    expect(configService.get).toHaveBeenCalledWith('MONGODB_URI');
  });

  it('should throw an error when MONGODB_URI is not set', () => {
    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;

    const factory = createMongooseOptions('test_db');

    expect(() => factory(configService)).toThrow('MongoDB URI is not configured. Set MONGODB_URI.');
  });
});
