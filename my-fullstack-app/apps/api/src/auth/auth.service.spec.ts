import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const user = {
    id: 'user-1',
    email: 'renbo@example.com',
    name: 'Renbo',
    avatarUrl: null,
    passwordHash: '',
    createdAt: new Date('2026-07-12T00:00:00.000Z'),
    updatedAt: new Date('2026-07-12T00:00:00.000Z'),
  };

  const findUnique = jest.fn();
  const create = jest.fn();
  let capturedPasswordHash = '';
  const signAsync = jest.fn().mockResolvedValue('signed-token');
  const prisma = { user: { findUnique, create } } as unknown as PrismaService;
  const jwt = { signAsync } as unknown as JwtService;
  const service = new AuthService(prisma, jwt);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers a user with a password hash and returns a token', async () => {
    findUnique.mockResolvedValue(null);
    create.mockImplementation((input: { data: { passwordHash: string } }) => {
      capturedPasswordHash = input.data.passwordHash;
      return Promise.resolve({
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      });
    });

    const result = await service.register({
      email: user.email,
      name: user.name,
      password: 'correct-password',
    });

    expect(capturedPasswordHash).not.toBe('correct-password');
    await expect(
      bcrypt.compare('correct-password', capturedPasswordHash),
    ).resolves.toBe(true);
    expect(result).toEqual({
      accessToken: 'signed-token',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: null,
      },
    });
    expect(signAsync).toHaveBeenCalledWith({ sub: user.id, email: user.email });
  });

  it('rejects an email that is already registered', async () => {
    findUnique.mockResolvedValue(user);
    await expect(
      service.register({
        email: user.email,
        name: user.name,
        password: 'correct-password',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(create).not.toHaveBeenCalled();
  });

  it('logs in with valid credentials', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 4);
    findUnique.mockResolvedValue({ ...user, passwordHash });

    const result = await service.login({
      email: user.email,
      password: 'correct-password',
    });

    expect(result.accessToken).toBe('signed-token');
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('does not reveal whether an account exists during failed login', async () => {
    findUnique.mockResolvedValue(null);
    await expect(
      service.login({
        email: 'missing@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toMatchObject<Partial<UnauthorizedException>>({
      message: 'Invalid email or password',
    });
  });
});
