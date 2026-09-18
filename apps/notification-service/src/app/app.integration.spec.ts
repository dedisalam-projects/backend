import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Model } from 'mongoose';
import { AppService } from './app.service';
import { Notification, NotificationSchema, NotificationDocument } from '@dedisalam/database';

describe('AppService Integration Test (E2E with MongoDB)', () => {
  let appService: AppService;
  let notificationModel: Model<NotificationDocument>;
  let mongod: MongoMemoryServer;
  let module: TestingModule;

  beforeAll(async () => {
    // Start MongoDB Memory Server
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
      ],
      providers: [AppService],
    }).compile();

    appService = module.get<AppService>(AppService);
    notificationModel = module.get<Model<NotificationDocument>>(`${Notification.name}Model`);
  });

  afterAll(async () => {
    await module.close();
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    // Clean up DB between tests
    await notificationModel.deleteMany({});
  });

  describe('Notification Workflows', () => {
    it('should successfully save and retrieve notifications', async () => {
      // Create
      const notif1 = await appService.processNotification('Hello 1', 'u1', 'INFO');
      const notif2 = await appService.processNotification('Hello 2', 'u1', 'ALERT');
      const notifOther = await appService.processNotification('Hello other', 'u2', 'INFO');

      expect(notif1.message).toBe('Hello 1');
      expect(notif1.isRead).toBe(false);
      expect((notif1 as any)._id).toBeDefined();

      // Retrieve
      const user1Notifs = await appService.getNotifications('u1');
      expect(user1Notifs).toHaveLength(2);
      // Sorted by createdAt desc, so notif2 is first
      expect(user1Notifs[0].message).toBe('Hello 2');
      expect(user1Notifs[1].message).toBe('Hello 1');

      const user2Notifs = await appService.getNotifications('u2');
      expect(user2Notifs).toHaveLength(1);
    });

    it('should mark a notification as read', async () => {
      const notif = await appService.processNotification('To be read', 'u1', 'INFO');
      expect(notif.isRead).toBe(false);

      const updated = await appService.markAsRead((notif as any)._id as string, 'u1');
      expect(updated).toBeDefined();
      expect(updated?.isRead).toBe(true);

      const dbDoc = await notificationModel.findById((notif as any)._id);
      expect(dbDoc?.isRead).toBe(true);
    });
  });
});
