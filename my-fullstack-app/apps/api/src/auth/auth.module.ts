import 'dotenv/config';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import type { JwtModuleOptions } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { APP_GUARD } from '@nestjs/core';

const jwtExpiresIn = (process.env.JWT_EXPIRATION_TIME ?? '7d') as NonNullable<
  JwtModuleOptions['signOptions']
>['expiresIn'];
const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: jwtExpiresIn,
      },
    }),

    // Redis gives every API instance one shared rate-limit counter.
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: process.env.NODE_ENV === 'production' ? 10 : Infinity,
        },
      ],
      storage: new ThrottlerStorageRedisService(redisUrl),
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleStrategy, //GoogleStrategy,
    GithubStrategy, //GihubStrategy,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  controllers: [AuthController],
})
export class AuthModule {}
