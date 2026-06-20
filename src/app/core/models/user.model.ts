export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  token: string;
  expiresAt: number;
}
