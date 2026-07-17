import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Profile } from 'passport-github2';
import { Strategy } from 'passport-github2';

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} must be set to enable GitHub authentication.`);
  }

  return value;
}

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor() {
    super({
      clientID: requiredEnv('GITHUB_CLIENT_ID'),
      clientSecret: requiredEnv('GITHUB_CLIENT_SECRET'),
      callbackURL:
        process.env.GITHUB_CALLBACK_URL ??
        'http://localhost:4000/auth/github/callback',
      scope: ['user:email'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile) {
    const email = profile.emails?.[0]?.value;

    if (!email) {
      throw new Error(
        'GitHub did not return an email address for this account.',
      );
    }

    return {
      email,
      name: profile.displayName || profile.username || 'GitHub user',
      avatarUrl: profile.photos?.[0]?.value ?? null,
      provider: 'github' as const,
      providerId: profile.id,
    };
  }
}
