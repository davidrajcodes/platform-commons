import {
  Component, ChangeDetectionStrategy, signal, inject, OnInit
} from '@angular/core';
import {
  ReactiveFormsModule, FormBuilder, Validators, FormGroup
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../core/services/auth.service';

/**
 * OnPush — login form only re-renders when signal/input references change.
 * The loading/error signals trigger change detection explicitly without
 * requiring zone-based dirty checking on every async tick.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <div class="login-page">
      <div class="login-card">
        <div class="login-card__header">
          <div class="login-card__logo">🛍️</div>
          <h1 class="login-card__title">Platform Commons</h1>
          <p class="login-card__subtitle">Sign in to your account</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="login-form" novalidate>
          <!-- Email -->
          <div class="form-group" [class.form-group--error]="showError('email')">
            <label for="email" class="form-label">Email address</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              placeholder="you@example.com"
              class="form-input"
              autocomplete="email"
            />
            @if (showError('email')) {
              <span class="form-error">
                @if (form.get('email')?.errors?.['required']) { Email is required. }
                @else { Enter a valid email address. }
              </span>
            }
          </div>

          <!-- Password -->
          <div class="form-group" [class.form-group--error]="showError('password')">
            <label for="password" class="form-label">Password</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              placeholder="••••••••"
              class="form-input"
              autocomplete="current-password"
            />
            @if (showError('password')) {
              <span class="form-error">Password is required.</span>
            }
          </div>

          <!-- Auth error -->
          @if (authError()) {
            <div class="alert alert--error" role="alert">{{ authError() }}</div>
          }

          <!-- Loading skeleton / Submit button -->
          @if (loading()) {
            <div class="skeleton-btn"></div>
          } @else {
            <button type="submit" class="btn-primary" [disabled]="form.invalid">
              Sign in
            </button>
          }
        </form>

        <div class="login-hints">
          <p class="login-hints__title">Demo accounts</p>
          <div class="hint-grid">
            <div class="hint-item">
              <strong>Admin:</strong> admin1&#64;platform.com / admin123
            </div>
            <div class="hint-item">
              <strong>User:</strong> user1&#64;platform.com / password
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 1rem;
    }
    .login-card {
      background: white;
      border-radius: 16px;
      padding: 2.5rem;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    }
    .login-card__header { text-align: center; margin-bottom: 2rem; }
    .login-card__logo { font-size: 3rem; margin-bottom: 0.5rem; }
    .login-card__title { font-size: 1.6rem; font-weight: 700; color: #1f2937; margin: 0 0 0.25rem; }
    .login-card__subtitle { color: #6b7280; margin: 0; }
    .login-form { display: flex; flex-direction: column; gap: 1.25rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
    .form-label { font-size: 0.875rem; font-weight: 600; color: #374151; }
    .form-input {
      padding: 0.7rem 1rem;
      border: 1.5px solid #d1d5db;
      border-radius: 8px;
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .form-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
    .form-group--error .form-input { border-color: #ef4444; }
    .form-error { font-size: 0.8rem; color: #ef4444; }
    .alert { padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.9rem; }
    .alert--error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
    .btn-primary {
      padding: 0.85rem;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.1s;
    }
    .btn-primary:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .skeleton-btn {
      height: 50px;
      border-radius: 8px;
      background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .login-hints {
      margin-top: 1.5rem;
      padding: 1rem;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .login-hints__title { font-size: 0.8rem; font-weight: 600; color: #64748b; margin: 0 0 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .hint-grid { display: flex; flex-direction: column; gap: 0.35rem; }
    .hint-item { font-size: 0.82rem; color: #475569; }
    .hint-item strong { color: #1e293b; }
  `]
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal(false);
  authError = signal<string | null>(null);

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  ngOnInit(): void {
    // If already authenticated, redirect
    if (this.auth.isAuthenticated()) {
      this.redirectByRole();
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.authError.set(null);

    const { email, password } = this.form.value;
    this.auth.login(email, password).subscribe({
      next: () => {
        this.loading.set(false);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        if (returnUrl) {
          this.router.navigateByUrl(returnUrl);
        } else {
          this.redirectByRole();
        }
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.authError.set(err.message ?? 'An error occurred. Please try again.');
      }
    });
  }

  showError(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  private redirectByRole(): void {
    this.router.navigate([this.auth.role() === 'admin' ? '/admin' : '/shop']);
  }
}
