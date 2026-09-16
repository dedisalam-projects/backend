import { UserRole } from '../constants/user-role.enum';

export interface IUser {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role?: UserRole | string;
  isActive?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}
