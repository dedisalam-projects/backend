import 'reflect-metadata';
import * as fc from 'fast-check';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AdminCreateUserDto, AdminUpdateUserDto, UserPaginationQueryDto } from './admin-user.dto';
import { NotificationBroadcastDto } from './notification-broadcast.dto';
import { RegisterDto, LoginDto } from './auth.dto';
import {
  arbitraryValidCreateUserPayload,
  arbitraryValidUpdateUserPayload,
  arbitraryValidNotificationPayload,
  arbitraryEmail,
  arbitraryPassword,
  arbitraryName,
} from '../test/arbitraries';

describe('DTO Property-Based Testing (Fast-Check)', () => {
  describe('AdminCreateUserDto & RegisterDto Properties', () => {
    it('should always validate successfully when valid fields are provided', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryValidCreateUserPayload, async (validPayload) => {
          const dto = plainToInstance(AdminCreateUserDto, validPayload);
          const errors = await validate(dto);
          expect(errors).toHaveLength(0);
        }),
        { numRuns: 100 },
      );
    });

    it('should never throw an uncaught exception on arbitrary fuzz payloads', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.anything(),
            password: fc.anything(),
            name: fc.anything(),
            role: fc.anything(),
          }),
          async (fuzzPayload) => {
            const dto = plainToInstance(AdminCreateUserDto, fuzzPayload);
            const errors = await validate(dto);
            expect(Array.isArray(errors)).toBe(true);
          },
        ),
        { numRuns: 150 },
      );
    });

    it('RegisterDto should always validate successfully for valid email, password, and name', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: arbitraryEmail,
            password: arbitraryPassword,
            name: arbitraryName,
          }),
          async (payload) => {
            const dto = plainToInstance(RegisterDto, payload);
            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('LoginDto should always reject invalid emails or empty passwords with ValidationError', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.string().filter((s) => !s.includes('@') || !s.includes('.')),
            password: fc.constant(''),
          }),
          async (invalidPayload) => {
            const dto = plainToInstance(LoginDto, invalidPayload);
            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('AdminUpdateUserDto Properties', () => {
    it('should always validate successfully when valid fields are provided', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryValidUpdateUserPayload, async (validPayload) => {
          const dto = plainToInstance(AdminUpdateUserDto, validPayload);
          const errors = await validate(dto);
          expect(errors).toHaveLength(0);
        }),
        { numRuns: 100 },
      );
    });

    it('should never throw an uncaught exception on arbitrary fuzz payloads', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.anything(),
            name: fc.anything(),
            role: fc.anything(),
            isActive: fc.anything(),
            password: fc.anything(),
          }),
          async (fuzzPayload) => {
            const dto = plainToInstance(AdminUpdateUserDto, fuzzPayload);
            const errors = await validate(dto);
            expect(Array.isArray(errors)).toBe(true);
          },
        ),
        { numRuns: 150 },
      );
    });
  });

  describe('NotificationBroadcastDto Properties', () => {
    it('should always validate successfully for valid title and message', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryValidNotificationPayload, async (validPayload) => {
          const dto = plainToInstance(NotificationBroadcastDto, validPayload);
          const errors = await validate(dto);
          expect(errors).toHaveLength(0);
        }),
        { numRuns: 100 },
      );
    });

    it('should never throw on arbitrary fuzz inputs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.anything(),
            message: fc.anything(),
            type: fc.anything(),
            recipientId: fc.anything(),
          }),
          async (fuzzPayload) => {
            const dto = plainToInstance(NotificationBroadcastDto, fuzzPayload);
            const errors = await validate(dto);
            expect(Array.isArray(errors)).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('UserPaginationQueryDto Invariants', () => {
    it('should correctly transform numeric strings to numbers or keep defaults', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1, max: 100 }),
          async (page, limit) => {
            const payload = { page: String(page), limit: String(limit) };
            const dto = plainToInstance(UserPaginationQueryDto, payload);
            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
            expect(typeof dto.page).toBe('number');
            expect(typeof dto.limit).toBe('number');
            expect(dto.page).toBe(page);
            expect(dto.limit).toBe(limit);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
