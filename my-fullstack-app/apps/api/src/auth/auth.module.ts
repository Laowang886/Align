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
import { APP_GUARD } from '@nestjs/core';

const jwtExpiresIn = (process.env.JWT_EXPIRATION_TIME ?? '7d') as NonNullable<
  JwtModuleOptions['signOptions']
>['expiresIn'];

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: jwtExpiresIn,
      },
    }),

    //We are using the ThrottlerModule to limit the number of requests a user can make within a certain time frame. In this case, we are allowing a maximum of 10 requests per minute (60000 milliseconds) from the same IP address. This helps to prevent abuse and protect our API from excessive requests.
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // Time window: 60000 milliseconds = 60 seconds
        limit: process.env.NODE_ENV === 'production' ? 10 : Infinity, //Within this time window, a maximum of 10 requests are allowed from the same IP address.
      },
    ]),
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
