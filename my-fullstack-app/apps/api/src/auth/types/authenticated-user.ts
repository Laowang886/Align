export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface JwtPayload {
  sub: string;
  email: string;
}
