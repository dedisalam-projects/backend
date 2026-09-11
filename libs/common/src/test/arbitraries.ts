import * as fc from 'fast-check';
import { UserRole } from '../constants/user-role.enum';

// Arbitrary valid email
export const arbitraryEmail = fc.emailAddress();

// Arbitrary strong password (min 8 chars, alphanumeric & symbols)
export const arbitraryPassword = fc.string({ minLength: 8, maxLength: 50 });

// Arbitrary valid name (min 3 chars)
export const arbitraryName = fc.string({ minLength: 3, maxLength: 50 });

// Arbitrary UserRole
export const arbitraryUserRole = fc.constantFrom(
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.USER,
  UserRole.GUEST,
);

// Arbitrary valid CreateAdminUserDto payload
export const arbitraryValidCreateUserPayload = fc.record({
  email: arbitraryEmail,
  password: arbitraryPassword,
  name: arbitraryName,
  role: fc.option(arbitraryUserRole, { nil: undefined }),
});

// Arbitrary valid UpdateAdminUserDto payload
export const arbitraryValidUpdateUserPayload = fc.record({
  userId: fc.uuid(),
  name: fc.option(arbitraryName, { nil: undefined }),
  role: fc.option(arbitraryUserRole, { nil: undefined }),
  isActive: fc.option(fc.boolean(), { nil: undefined }),
  password: fc.option(arbitraryPassword, { nil: undefined }),
});

// Arbitrary valid NotificationBroadcastDto payload
export const arbitraryValidNotificationPayload = fc.record({
  title: fc.string({ minLength: 1, maxLength: 100 }),
  message: fc.string({ minLength: 1, maxLength: 500 }),
  type: fc.option(fc.constantFrom('info', 'warning', 'success', 'error'), { nil: undefined }),
  recipientId: fc.option(fc.uuid(), { nil: undefined }),
});
