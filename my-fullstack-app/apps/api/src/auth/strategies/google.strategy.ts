// apps/api/src/auth/strategies/google.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Profile } from 'passport-google-oauth20';
import { Strategy } from 'passport-google-oauth20';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set to enable Google authentication.`);
  }

  return value;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: requiredEnv('GOOGLE_CLIENT_ID'),
      clientSecret: requiredEnv('GOOGLE_CLIENT_SECRET'),
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ??
        'http://localhost:4000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile) {
    const { emails, displayName, photos, id } = profile;
    const email = emails?.[0]?.value;
    if (!email) {
      throw new Error(
        'Google did not return an email address for this account.',
      );
    }

    const user = {
      email,
      name: displayName || 'Google user',
      avatarUrl: photos?.[0]?.value ?? null,
      provider: 'google' as const,
      providerId: id,
    };

    return user;
  }
}
