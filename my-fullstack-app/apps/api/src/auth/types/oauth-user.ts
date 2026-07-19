export type OAuthProvider = 'google' | 'github';

export interface OAuthUser {
  email: string;
  name: string;
  avatarUrl: string | null;
  provider: OAuthProvider;
  providerId: string;
}
