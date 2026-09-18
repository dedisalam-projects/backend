import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Model } from 'mongoose';
import { AuthService } from './auth.service';
import { User, UserSchema, UserDocument, RedisService } from '@dedisalam/database';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

describe('AuthService Integration Test (E2E with MongoDB)', () => {
  let authService: AuthService;
  let userModel: Model<UserDocument>;
  let mongod: MongoMemoryServer;
  let module: TestingModule;

  // Stubs for external dependencies
  const mockRedisClient = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockNotificationClient = {
    emit: jest.fn(),
    send: jest.fn(),
  };

  beforeAll(async () => {
    // Spin up an ephemeral in-memory MongoDB instance
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
      ],
      providers: [
        AuthService,
        {
          provide: RedisService,
          useValue: mockRedisClient,
        },
        {
          provide: 'NOTIFICATION_SERVICE_RMQ',
          useValue: mockNotificationClient,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('dummy'),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
    if (module) await module.close();
  });

  beforeEach(async () => {
    // Clean database before each test
    await userModel.deleteMany({});
    jest.clearAllMocks();
  });

  describe('deleteUsers (Bulk Deletion Integration)', () => {
    it('should successfully delete valid users and skip super_admin in real database', async () => {
      // 1. Arrange: Insert test data into MongoDB
      const users = await userModel.insertMany([
        {
          name: 'User 1',
          email: 'user1@test.com',
          password: 'hash1',
          role: 'user',
          isActive: true,
        },
        {
          name: 'Admin 1',
          email: 'admin1@test.com',
          password: 'hash2',
          role: 'admin',
          isActive: true,
        },
        {
          name: 'SuperAdmin',
          email: 'superadmin@example.com',
          password: 'hash3',
          role: 'super_admin',
          isActive: true,
        },
      ]);

      const user1Id = users[0]._id.toString();
      const admin1Id = users[1]._id.toString();
      const superAdminId = users[2]._id.toString();

      // 2. Act: Call the service method
      const result = await authService.deleteUsers([user1Id, admin1Id, superAdminId]);

      // 3. Assert: Check the exact response
      expect(result.deletedCount).toBe(2);
      expect(result.userIds).toHaveLength(2);

      // Check the state of the real database
      const remainingUsers = await userModel.find();
      expect(remainingUsers).toHaveLength(1);
      expect(remainingUsers[0].email).toBe('superadmin@example.com'); // Only superadmin survived

      // Check side-effects (Redis and RMQ were still mocked)
      expect(mockRedisClient.set).toHaveBeenCalledTimes(2);
      expect(mockNotificationClient.emit).toHaveBeenCalledWith(
        'users.deletedMany',
        expect.any(Object),
      );
    });

    it('should throw BadRequestException if array contains only superadmins', async () => {
      const superAdmin = await userModel.create({
        name: 'SuperAdmin',
        email: 'superadmin@example.com',
        password: 'hash3',
        role: 'super_admin',
        isActive: true,
      });

      await expect(authService.deleteUsers([superAdmin._id.toString()])).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
