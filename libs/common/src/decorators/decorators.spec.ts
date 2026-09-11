import { IS_PUBLIC_KEY, Public } from './public.decorator';
import { ROLES_KEY, Roles } from './roles.decorator';

describe('Common Decorators', () => {
  it('should define Public decorator metadata', () => {
    class TestClass {
      @Public()
      testMethod() {
        return true;
      }
    }

    expect(IS_PUBLIC_KEY).toBe('isPublic');
    const isPublic = Reflect.getMetadata(IS_PUBLIC_KEY, TestClass.prototype.testMethod);
    expect(isPublic).toBe(true);
  });

  it('should define Roles decorator metadata', () => {
    class TestClass {
      @Roles('admin', 'super_admin')
      testMethod() {
        return true;
      }
    }

    expect(ROLES_KEY).toBe('roles');
    const roles = Reflect.getMetadata(ROLES_KEY, TestClass.prototype.testMethod);
    expect(roles).toEqual(['admin', 'super_admin']);
  });
});
