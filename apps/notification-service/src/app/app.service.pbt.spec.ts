import 'reflect-metadata';
import * as fc from 'fast-check';
import { AppService } from './app.service';

describe('AppService Property-Based Testing (Fast-Check)', () => {
  let appService: any;
  let mockSave: jest.Mock;
  let mockNotificationModel: any;

  beforeEach(() => {
    mockSave = jest.fn().mockImplementation(function (this: any) {
      return Promise.resolve(this);
    });

    mockNotificationModel = jest.fn().mockImplementation((dto: any) => {
      return {
        ...dto,
        save: mockSave,
      };
    });

    appService = new AppService(mockNotificationModel);

    // Silence logger for clean test output
    jest
      .spyOn(require('@nestjs/common').Logger.prototype, 'log')
      .mockImplementation(() => undefined);
  });

  describe('processNotification', () => {
    it('should always use default values for falsy strings, and exact values for truthy strings', async () => {
      await fc.assert(
        fc.asyncProperty(fc.string(), fc.string(), fc.string(), async (message, userId, type) => {
          // Reset mock
          mockSave.mockClear();

          const result = await appService.processNotification(message, userId, type);

          // title and type depend on `type || 'System Alert'` / `'INFO'`
          expect(result.title).toBe(type || 'System Alert');
          expect(result.type).toBe(type || 'INFO');

          // message depends on `message || 'Hello World Notification'`
          expect(result.message).toBe(message || 'Hello World Notification');

          // userId depends on `userId || 'system-user-id'`
          expect(result.userId).toBe(userId || 'system-user-id');

          expect(result.isRead).toBe(false);
          expect(mockSave).toHaveBeenCalled();
        }),
        { numRuns: 1000 },
      );
    });
  });
});
