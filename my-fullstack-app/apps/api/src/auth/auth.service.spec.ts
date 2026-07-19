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
  const update = jest.fn();
  const identityFindUnique = jest.fn();
  const identityCreate = jest.fn();
  let capturedPasswordHash = '';
  const signAsync = jest.fn().mockResolvedValue('signed-token');
  const prisma = {
    user: { findUnique, create, update },
    oAuthIdentity: { findUnique: identityFindUnique, create: identityCreate },
  } as unknown as PrismaService;
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

  it('creates a user when a new Google identity signs in', async () => {
    identityFindUnique.mockResolvedValue(null);
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({
      ...user,
      passwordHash: null,
      provider: 'google',
      providerId: 'google-user-1',
    });

    const result = await service.loginWithOAuth({
      provider: 'google',
      providerId: 'google-user-1',
      email: user.email.toUpperCase(),
      name: user.name,
      avatarUrl: 'https://example.com/avatar.png',
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        email: user.email,
        name: user.name,
        avatarUrl: 'https://example.com/avatar.png',
        provider: 'google',
        providerId: 'google-user-1',
        oauthIdentities: {
          create: {
            provider: 'google',
            providerId: 'google-user-1',
          },
        },
      },
    });
    expect(result.accessToken).toBe('signed-token');
  });

  it('signs in an existing OAuth user by provider identity', async () => {
    identityFindUnique.mockResolvedValue({
      user: { ...user, passwordHash: null },
    });

    const result = await service.loginWithOAuth({
      provider: 'github',
      providerId: 'github-user-1',
      email: user.email,
      name: user.name,
      avatarUrl: null,
    });

    expect(findUnique).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(result.user).toMatchObject({ id: user.id, email: user.email });
  });

  it('links a new OAuth provider to an existing account with the same email', async () => {
    identityFindUnique.mockResolvedValue(null);
    findUnique.mockResolvedValue({ ...user, passwordHash: 'hash' });
    identityCreate.mockResolvedValue({});
    update.mockResolvedValue(user);

    const result = await service.loginWithOAuth({
      provider: 'github',
      providerId: 'github-user-1',
      email: user.email,
      name: user.name,
      avatarUrl: null,
    });

    expect(identityCreate).toHaveBeenCalledWith({
      data: {
        userId: user.id,
        provider: 'github',
        providerId: 'github-user-1',
      },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { provider: 'github', providerId: 'github-user-1' },
    });
    expect(result.user).toMatchObject({ id: user.id, email: user.email });
  });

  it('rejects password login for an OAuth-only account', async () => {
    findUnique.mockResolvedValue({ ...user, passwordHash: null });

    await expect(
      service.login({ email: user.email, password: 'correct-password' }),
    ).rejects.toMatchObject<Partial<UnauthorizedException>>({
      message: 'Invalid email or password',
    });
  });
});
