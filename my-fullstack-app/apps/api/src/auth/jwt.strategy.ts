// 定义“JWT 怎样验证”。当请求带有：
// Authorization: Bearer <token>
// Passport 会调用这个文件的逻辑，验证 token 是否有效，并找出 token 对应的用户。
import 'dotenv/config';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface JwtPayload {
  sub: string;
  email: string;
}

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
  constructor() {
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

  validate(payload: JwtPayload) {
    return {
      id: payload.sub,
      email: payload.email,
    };
  }
}
