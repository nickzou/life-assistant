import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DatabaseService } from './database.service';
import { TaskMapping } from './entities/task-mapping.entity';
import { SyncLog } from './entities/sync-log.entity';
import { User } from './entities/user.entity';

describe('DatabaseService', () => {
  let service: DatabaseService;
  let userRepository: any;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    password_hash: 'hashed',
    wrike_token: null,
    clickup_token: null,
    created_at: new Date(),
  };

  beforeEach(async () => {
    const mockTaskMappingRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    };

    const mockSyncLogRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const mockUserRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseService,
        { provide: getRepositoryToken(TaskMapping), useValue: mockTaskMappingRepo },
        { provide: getRepositoryToken(SyncLog), useValue: mockSyncLogRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
      ],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
    userRepository = module.get(getRepositoryToken(User));
  });

  describe('updateUserTokens', () => {
    it('should update wrike token', async () => {
      const user = { ...mockUser };
      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockResolvedValue({ ...user, wrike_token: 'new-wrike-token' });

      const result = await service.updateUserTokens('user-123', 'new-wrike-token', undefined);

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ wrike_token: 'new-wrike-token' }),
      );
      expect(result.wrike_token).toBe('new-wrike-token');
    });

    it('should update clickup token', async () => {
      const user = { ...mockUser };
      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockResolvedValue({ ...user, clickup_token: 'new-clickup-token' });

      const result = await service.updateUserTokens('user-123', undefined, 'new-clickup-token');

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ clickup_token: 'new-clickup-token' }),
      );
      expect(result.clickup_token).toBe('new-clickup-token');
    });

    it('should update both tokens', async () => {
      const user = { ...mockUser };
      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockResolvedValue({
        ...user,
        wrike_token: 'wrike-token',
        clickup_token: 'clickup-token',
      });

      await service.updateUserTokens('user-123', 'wrike-token', 'clickup-token');

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          wrike_token: 'wrike-token',
          clickup_token: 'clickup-token',
        }),
      );
    });

    it('should throw error when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateUserTokens('nonexistent-id', 'token'),
      ).rejects.toThrow('User not found');
    });

    it('should not modify tokens when not provided', async () => {
      const user = { ...mockUser, wrike_token: 'existing-wrike', clickup_token: 'existing-clickup' };
      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockResolvedValue(user);

      await service.updateUserTokens('user-123', undefined, undefined);

      // Tokens should remain unchanged
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          wrike_token: 'existing-wrike',
          clickup_token: 'existing-clickup',
        }),
      );
    });
  });
});
