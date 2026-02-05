import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '@database/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    password_hash: '$2b$10$hashedpassword',
    wrike_token: null,
    clickup_token: null,
    created_at: new Date(),
  };

  beforeEach(async () => {
    const mockUserRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    jwtService = module.get(JwtService);
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      const password = 'correctpassword';
      const hashedPassword = await bcrypt.hash(password, 10);
      const userWithHash = { ...mockUser, password_hash: hashedPassword };

      userRepository.findOne.mockResolvedValue(userWithHash);

      const result = await service.validateUser('test@example.com', password);

      expect(result).toEqual(userWithHash);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null when user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser(
        'nonexistent@example.com',
        'password',
      );

      expect(result).toBeNull();
    });

    it('should return null when password is incorrect', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      const userWithHash = { ...mockUser, password_hash: hashedPassword };

      userRepository.findOne.mockResolvedValue(userWithHash);

      const result = await service.validateUser(
        'test@example.com',
        'wrongpassword',
      );

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access token and user info', async () => {
      jwtService.sign.mockReturnValue('jwt-token-123');

      const result = await service.login(mockUser);

      expect(result).toEqual({
        access_token: 'jwt-token-123',
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-123',
        email: 'test@example.com',
      });
    });
  });

  describe('findUserById', () => {
    it('should return user when found', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findUserById('user-123');

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
    });

    it('should return null when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findUserById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('hashPassword', () => {
    it('should return a bcrypt hash', async () => {
      const password = 'mypassword';

      const result = await service.hashPassword(password);

      expect(result).toMatch(/^\$2[aby]\$\d+\$/);
      expect(await bcrypt.compare(password, result)).toBe(true);
    });

    it('should return different hashes for same password', async () => {
      const password = 'mypassword';

      const hash1 = await service.hashPassword(password);
      const hash2 = await service.hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('createUser', () => {
    it('should create and return a new user', async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);

      const result = await service.createUser(
        'test@example.com',
        'password123',
      );

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(userRepository.create).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw error if user already exists', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.createUser('test@example.com', 'password123'),
      ).rejects.toThrow('User with email test@example.com already exists');
    });
  });
});
