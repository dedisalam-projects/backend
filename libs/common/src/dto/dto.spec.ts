import 'reflect-metadata';
import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  AdminCreateUserDto,
  AdminUpdateUserDto,
  UserPaginationQueryDto,
  NotificationBroadcastDto,
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
} from './index';
import { UserRole } from '../constants/user-role.enum';

describe('Common DTOs Validation', () => {
  describe('AdminCreateUserDto', () => {
    it('should pass validation with valid properties', () => {
      const dto = plainToInstance(AdminCreateUserDto, {
        email: 'test@example.com',
        password: 'password123',
        name: 'John Doe',
        role: UserRole.USER,
      });

      const errors = validateSync(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid email and short password/name', () => {
      const dto = plainToInstance(AdminCreateUserDto, {
        email: 'invalid-email',
        password: 'short',
        name: 'ab',
        role: 'invalid-role',
      });

      const errors = validateSync(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('AdminUpdateUserDto', () => {
    it('should pass validation with optional properties', () => {
      const dto = plainToInstance(AdminUpdateUserDto, {
        userId: 'u123',
        name: 'Updated Name',
        role: UserRole.ADMIN,
        isActive: false,
        password: 'new-password123',
      });

      const errors = validateSync(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when userId is missing', () => {
      const dto = plainToInstance(AdminUpdateUserDto, {});
      const errors = validateSync(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('UserPaginationQueryDto', () => {
    it('should convert and validate pagination query numbers', () => {
      const dto = plainToInstance(
        UserPaginationQueryDto,
        {
          page: '2',
          limit: '20',
          search: 'john',
          role: UserRole.ADMIN,
        },
        { enableImplicitConversion: true },
      );

      const errors = validateSync(dto);
      expect(errors).toHaveLength(0);
      expect(dto.page).toBe(2);
      expect(dto.limit).toBe(20);
    });
  });

  describe('NotificationBroadcastDto', () => {
    it('should validate notification broadcast fields', () => {
      const dto = plainToInstance(NotificationBroadcastDto, {
        title: 'System Alert',
        message: 'Maintenance in 5m',
        type: 'warning',
        recipientId: 'u1',
      });

      const errors = validateSync(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Auth DTOs', () => {
    it('should validate RegisterDto, LoginDto, and RefreshTokenDto', () => {
      const regDto = plainToInstance(RegisterDto, {
        email: 'reg@example.com',
        password: 'strongpassword123',
        name: 'Registrant',
        role: UserRole.USER,
      });
      expect(validateSync(regDto)).toHaveLength(0);

      const loginDto = plainToInstance(LoginDto, {
        email: 'reg@example.com',
        password: 'strongpassword123',
      });
      expect(validateSync(loginDto)).toHaveLength(0);

      const refreshDto = plainToInstance(RefreshTokenDto, {
        userId: '60d5ecb8b5436e2f8c5b5f8c',
        refreshToken: '43b9d0b0a8f8d9b1',
      });
      expect(validateSync(refreshDto)).toHaveLength(0);
    });
  });
});
