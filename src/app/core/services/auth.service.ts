import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, delay, map, throwError } from 'rxjs';
import { User, AuthSession, UserRole } from '../models/user.model';

const SESSION_KEY = 'platform_session';

function sha256Mock(input: string): string {
  // Deterministic mock hash — maps known passwords to stored hashes
  // In production this would use the Web Crypto API
  const table: Record<string, string> = {
    'admin123': '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
    '123456':   '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
    'password': '0a041b9462caa4a31bac3567e0b6e6fd9100787db2ab433d96f6d178cabfce90',
    'userpass': '1ba3d16e9881959f8c9a9762854f72c6e6321cdd44358a10a4e939033117eab9',
  };
  return table[input] ?? '';
}

function createMockJWT(session: Omit<AuthSession, 'token'>): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = btoa(JSON.stringify(session));
  return `${header}.${payload}.mock-signature`;
}

function decodeMockJWT(token: string): Omit<AuthSession, 'token'> | null {
  try {
    const parts = token.split('.');
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // Signals — single source of truth for identity
  private _session = signal<AuthSession | null>(null);

  readonly currentUser = computed(() => this._session());
  readonly role = computed<UserRole | null>(() => this._session()?.role ?? null);
  readonly isAuthenticated = computed(() => this._session() !== null);

  constructor() {
    this.rehydrateSession();
  }

  login(email: string, password: string): Observable<AuthSession> {
    return this.http.get<User[]>('/assets/users.json').pipe(
      delay(600), // Simulate network round-trip
      map(users => {
        const hash = sha256Mock(password);
        const found = users.find(u => u.email === email && u.passwordHash === hash);
        if (!found) {
          throw new Error('Invalid email or password.');
        }
        const expiresAt = Date.now() + 8 * 60 * 60 * 1000; // 8h
        const sessionBase = {
          userId: found.id,
          email: found.email,
          name: found.name,
          role: found.role,
          expiresAt,
        };
        const token = createMockJWT(sessionBase);
        const session: AuthSession = { ...sessionBase, token };
        this._session.set(session);
        sessionStorage.setItem(SESSION_KEY, token);
        return session;
      })
    );
  }

  logout(): void {
    this._session.set(null);
    sessionStorage.removeItem(SESSION_KEY);
    this.router.navigate(['/login']);
  }

  private rehydrateSession(): void {
    const token = sessionStorage.getItem(SESSION_KEY);
    if (!token) return;
    const payload = decodeMockJWT(token);
    if (!payload || payload.expiresAt < Date.now()) {
      sessionStorage.removeItem(SESSION_KEY);
      return;
    }
    this._session.set({ ...payload, token });
  }
}
