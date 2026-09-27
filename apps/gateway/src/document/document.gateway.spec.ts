import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DocumentGateway } from './document.gateway';
import * as jwt from 'jsonwebtoken';

describe('DocumentGateway', () => {
  let gateway: DocumentGateway;
  let mockServer: any;
  let mockRoom: any;
  let mockClient: any;

  beforeEach(async () => {
    mockRoom = {
      emit: jest.fn(),
    };

    mockServer = {
      to: jest.fn().mockReturnValue(mockRoom),
      emit: jest.fn(),
    };

    mockClient = {
      id: 'client-1',
      join: jest.fn(),
      leave: jest.fn(),
      handshake: {
        headers: {},
        query: {},
      },
      data: {},
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentGateway,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-jwt-secret'),
          },
        },
      ],
    }).compile();

    gateway = module.get<DocumentGateway>(DocumentGateway);
    gateway.server = mockServer;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('should handle lifecycle hooks and connection with authorization header', () => {
    expect(() => gateway.afterInit(mockServer)).not.toThrow();

    // Anonymous connection
    gateway.handleConnection(mockClient);
    expect(mockClient.data.user).toBeUndefined();

    // Authenticated connection with Bearer header
    const token = jwt.sign({ sub: 'user-1' }, 'test-jwt-secret');
    const authClient = {
      ...mockClient,
      handshake: {
        headers: { authorization: `Bearer ${token}` },
        query: {},
      },
    };
    gateway.handleConnection(authClient);
    expect(authClient.data.user).toBeDefined();

    // Connection with invalid Bearer token
    const invalidClient = {
      ...mockClient,
      handshake: {
        headers: { authorization: 'Bearer invalid-token' },
        query: {},
      },
    };
    expect(() => gateway.handleConnection(invalidClient)).not.toThrow();

    // Query token connection
    const queryClient = {
      ...mockClient,
      handshake: {
        headers: {},
        query: { token },
      },
    };
    gateway.handleConnection(queryClient);
    expect(queryClient.data.user).toBeDefined();

    // Disconnect
    expect(() => gateway.handleDisconnect(mockClient)).not.toThrow();
  });

  it('should handle join:provider', () => {
    const res = gateway.handleJoinProvider(mockClient, { provider: 'traveloka' });
    expect(res.success).toBe(true);
    expect(res.room).toBe('traveloka');
    expect(mockClient.join).toHaveBeenCalledWith('traveloka');

    const resEmpty = gateway.handleJoinProvider(mockClient, { provider: '' });
    expect(resEmpty.success).toBe(false);
    expect(resEmpty.message).toBe('Provider name required');
  });

  it('should handle leave:provider', () => {
    const res = gateway.handleLeaveProvider(mockClient, { provider: 'traveloka' });
    expect(res.success).toBe(true);
    expect(res.room).toBe('traveloka');
    expect(mockClient.leave).toHaveBeenCalledWith('traveloka');

    const resEmpty = gateway.handleLeaveProvider(mockClient, { provider: '' });
    expect(resEmpty.success).toBe(false);
    expect(resEmpty.message).toBe('Provider name required');
  });

  it('should notify created to room and namespace', () => {
    gateway.notifyCreated('traveloka', { _id: '1' });
    expect(mockServer.to).toHaveBeenCalledWith('traveloka');
    expect(mockRoom.emit).toHaveBeenCalledWith('document:created', {
      provider: 'traveloka',
      data: { _id: '1' },
    });
    expect(mockServer.emit).toHaveBeenCalledWith('document:created', {
      provider: 'traveloka',
      data: { _id: '1' },
    });
  });

  it('should notify updated to room and namespace', () => {
    gateway.notifyUpdated('gojek', { _id: '2' });
    expect(mockServer.to).toHaveBeenCalledWith('gojek');
    expect(mockRoom.emit).toHaveBeenCalledWith('document:updated', {
      provider: 'gojek',
      data: { _id: '2' },
    });
    expect(mockServer.emit).toHaveBeenCalledWith('document:updated', {
      provider: 'gojek',
      data: { _id: '2' },
    });
  });

  it('should notify deleted to room and namespace', () => {
    gateway.notifyDeleted('indrive', '3');
    expect(mockServer.to).toHaveBeenCalledWith('indrive');
    expect(mockRoom.emit).toHaveBeenCalledWith('document:deleted', {
      provider: 'indrive',
      id: '3',
    });
    expect(mockServer.emit).toHaveBeenCalledWith('document:deleted', {
      provider: 'indrive',
      id: '3',
    });
  });

  it('should notify generated to room and namespace', () => {
    gateway.notifyGenerated('jackal', { _id: '4' });
    expect(mockServer.to).toHaveBeenCalledWith('jackal');
    expect(mockRoom.emit).toHaveBeenCalledWith('document:generated', {
      provider: 'jackal',
      data: { _id: '4' },
    });
    expect(mockServer.emit).toHaveBeenCalledWith('document:generated', {
      provider: 'jackal',
      data: { _id: '4' },
    });
  });
});
