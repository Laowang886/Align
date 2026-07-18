// 定义“JWT 怎样验证”。当请求带有：
// Authorization: Bearer <token>
// Passport 会调用这个文件的逻辑，验证 token 是否有效，并找出 token 对应的用户。
import 'dotenv/config';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser, JwtPayload } from './types/authenticated-user';

const cookieExtractor = (request: Request): string | null => {
  const cookies: unknown = request?.cookies;

  if (typeof cookies !== 'object' || cookies === null) {
    return null;
  }

  const token = (cookies as Record<string, unknown>).token;
  return typeof token === 'string' ? token : null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        avatarColor: true,
        provider: true,
      },
    });
    if (!user) throw new UnauthorizedException('Invalid authentication token');
    return user;
  }
}
