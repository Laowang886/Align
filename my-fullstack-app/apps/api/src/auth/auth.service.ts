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

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Compare the provided password with the hashed password stored in the database
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.createAuthResponse(user);
  }

  private async createAuthResponse(user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    passwordHash: string;
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
