// 认证的核心业务逻辑，例如：
// 查询用户是否已存在
// 使用 bcrypt 加密密码
// 创建 User
// 比较登录密码
// 签发 JWT token
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { OAuthUser } from './types/oauth-user';

// auth.service.ts 顶部，或者单独一个 utils 文件
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}
  async register(dto: RegisterDto) {
    const email = normalizeEmail(dto.email);
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hash the password before storing it in the database
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email,
        passwordHash: hashedPassword,
      },
    });

    return this.createAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const email = normalizeEmail(dto.email);
    // Search for the user in the database by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Compare the provided password with the hashed password stored in the database
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.createAuthResponse(user);
  }

  //This function handles the OAuth login process. It checks if a user with the given provider and providerId already exists in the database. If so, it returns an authentication response for that user. If not, it checks if a user with the same email already exists. If such a user exists, it throws a ConflictException. If no conflicts are found, it creates a new user in the database with the provided OAuth information and returns an authentication response for the newly created user.
  async loginWithOAuth(oauthUser: OAuthUser) {
    const email = normalizeEmail(oauthUser.email);
    const existingOAuthUser = await this.prisma.user.findFirst({
      where: {
        provider: oauthUser.provider,
        providerId: oauthUser.providerId,
      },
    });

    if (existingOAuthUser) {
      return this.createAuthResponse(existingOAuthUser);
    }

    const existingEmailUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingEmailUser) {
      throw new ConflictException(
        'An account with this email already exists. Sign in with your existing method first.',
      );
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        name: oauthUser.name.trim() || 'New user',
        avatarUrl: oauthUser.avatarUrl,
        provider: oauthUser.provider,
        providerId: oauthUser.providerId,
      },
    });

    return this.createAuthResponse(user);
  }

  private async createAuthResponse(user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    passwordHash: string | null;
  }) {
    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload);

    const { passwordHash, ...safeUser } = user;
    void passwordHash;

    return {
      accessToken,
      user: safeUser,
    };
  }
}
