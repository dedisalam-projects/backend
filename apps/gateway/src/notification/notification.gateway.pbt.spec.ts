import 'reflect-metadata';
import * as fc from 'fast-check';
import { NotificationGateway } from './notification.gateway';
import { Socket } from 'socket.io';

describe('NotificationGateway Property-Based Testing (Fast-Check)', () => {
  let gateway: any;

  beforeEach(() => {
    // Mock dependencies
    const mockNotificationClient = { send: jest.fn() };
    const mockConfigService = { get: jest.fn().mockReturnValue('secret') };

    gateway = new NotificationGateway(mockNotificationClient as any, mockConfigService as any);
  });

  describe('extractToken', () => {
    it('should extract token from handshake auth', () => {
      fc.assert(
        fc.property(fc.base64String({ minLength: 1 }), (token) => {
          const client = {
            handshake: { auth: { token } },
          } as unknown as Socket;

          const extracted = gateway.extractToken(client);
          const expected = token.startsWith('Bearer ') ? token.slice(7) : token;
          expect(extracted).toBe(expected);
        }),
      );
    });

    it('should extract token from handshake headers (Authorization)', () => {
      fc.assert(
        fc.property(fc.base64String({ minLength: 1 }), (token) => {
          const client = {
            handshake: { headers: { authorization: token } },
          } as unknown as Socket;

          const extracted = gateway.extractToken(client);
          const expected = token.startsWith('Bearer ') ? token.slice(7) : token;
          expect(extracted).toBe(expected);
        }),
      );
    });

    it('should extract token from handshake query', () => {
      fc.assert(
        fc.property(fc.base64String({ minLength: 1 }), (token) => {
          const client = {
            handshake: { query: { token } },
          } as unknown as Socket;

          const extracted = gateway.extractToken(client);
          expect(extracted).toBe(token);
        }),
      );
    });

    it('should extract token from cookies', () => {
      fc.assert(
        fc.property(fc.base64String({ minLength: 1 }), (token) => {
          fc.pre(!token.includes(';') && !token.includes('='));
          const client = {
            handshake: { headers: { cookie: `accessToken=${token}` } },
          } as unknown as Socket;

          const extracted = gateway.extractToken(client);
          expect(extracted).toBe(token);
        }),
      );
    });

    it('should not throw on malformed handshake objects and return null', () => {
      fc.assert(
        fc.property(fc.anything(), (handshake) => {
          const client = { handshake } as unknown as Socket;

          try {
            const extracted = gateway.extractToken(client);
            if (extracted !== null) {
              expect(typeof extracted).toBe('string');
            }
          } catch (e) {
            expect(e).toBeUndefined();
          }
        }),
      );
    });
  });

  describe('checkAdmin', () => {
    it('should throw WsException when roles do not contain admin', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string().filter((s) => s !== 'admin' && s !== 'super_admin')),
          (roles) => {
            const client = {
              data: { user: { roles } },
            } as unknown as Socket;

            expect(() => gateway.checkAdmin(client)).toThrow(
              'Forbidden: Admin privileges required',
            );
          },
        ),
      );
    });

    it('should pass when user has admin role', () => {
      fc.assert(
        fc.property(fc.array(fc.string()), (roles) => {
          roles.push('admin');
          const client = {
            data: { user: { roles } },
          } as unknown as Socket;

          expect(() => gateway.checkAdmin(client)).not.toThrow();
        }),
      );
    });

    it('should gracefully handle malformed role fields without crashing', () => {
      fc.assert(
        fc.property(fc.anything(), (roles) => {
          fc.pre(roles !== 'admin' && roles !== 'super_admin');
          if (Array.isArray(roles) && (roles.includes('admin') || roles.includes('super_admin')))
            return;

          const client = {
            data: { user: { roles } },
          } as unknown as Socket;

          expect(() => gateway.checkAdmin(client)).toThrow();
        }),
      );
    });
  });
});
