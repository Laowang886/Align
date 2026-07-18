// packages/shared/src/types/auth.ts

// Agreement that the frontend and backend have on the shape of the data for authentication
export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  name: string;
}

//Agreement that returned from the backend after login or register

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  avatarColor: string | null;
  provider: "google" | "github" | null;
}

export interface AuthResponse {
  user: AuthenticatedUser;
}
