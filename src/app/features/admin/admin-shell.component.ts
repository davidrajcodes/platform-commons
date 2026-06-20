import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <!-- Sidebar -->
      <aside class="sidebar" [class.sidebar--collapsed]="sidebarCollapsed()">
        <div class="sidebar__brand">
          <span class="sidebar__logo">⚡</span>
          @if (!sidebarCollapsed()) {
            <span class="sidebar__brand-text">Admin Panel</span>
          }
          <button class="sidebar__toggle" [class.collapsed]="sidebarCollapsed()" (click)="sidebarCollapsed.set(!sidebarCollapsed())">
            <span class="togle">{{ sidebarCollapsed() ? '▶' : '◀' }}</span>
          </button>
        </div>

        <nav class="sidebar__nav">
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="sidebar__link--active"
              class="sidebar__link"
              [title]="item.label"
            >
              <span class="sidebar__link-icon">{{ item.icon }}</span>
              @if (!sidebarCollapsed()) {
                <span class="sidebar__link-label">{{ item.label }}</span>
              }
            </a>
          }
        </nav>

        <div class="sidebar__footer">
          <div class="sidebar__user">
            <div class="sidebar__avatar">{{ initials() }}</div>
            @if (!sidebarCollapsed()) {
              <div class="sidebar__user-info">
                <div class="sidebar__user-name">{{ auth.currentUser()?.name }}</div>
                <div class="sidebar__user-role">Administrator</div>
              </div>
            }
          </div>
          <button class="sidebar__logout" (click)="logout()" [title]="'Logout'">
            {{ sidebarCollapsed() ? '🚪' : '🚪 Logout' }}
          </button>
        </div>
      </aside>

      <!-- Main content -->
      <main class="main-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .shell { display: flex; min-height: 100vh; background: #f8fafc; }
    .sidebar {
      width: 240px;
      background: #1e1b4b;
      display: flex;
      flex-direction: column;
      transition: width 0.25s ease;
      position: sticky;
      top: 0;
      height: 100vh;
      flex-shrink: 0;
    }
    .sidebar--collapsed { width: 64px; }
    .sidebar__brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1.25rem 1rem;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      overflow: hidden;
    }
    .sidebar__logo { font-size: 1.5rem; flex-shrink: 0; }
    .sidebar__brand-text { color: white; font-size: 1rem; font-weight: 700; white-space: nowrap; flex: 1; }
    .sidebar__toggle {
      margin-left: auto;
      background: rgba(255,255,255,0.1);
      border: none;
      color: white;
      border-radius: 4px;
      width: 24px;
      height: 30px;
      cursor: pointer;
      font-size: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      // flex-shrink: 0;
      &.collapsed{
        background-color: #fff;
      }
    }
    
    .sidebar__nav { flex: 1; padding: 1rem 0.5rem; display: flex; flex-direction: column; gap: 0.25rem; }
    .sidebar__link {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.7rem 0.75rem;
      border-radius: 8px;
      color: rgba(255,255,255,0.7);
      text-decoration: none;
      transition: background 0.15s, color 0.15s;
      white-space: nowrap;
      overflow: hidden;
    }
    .sidebar__link:hover { background: rgba(255,255,255,0.1); color: white; }
    .sidebar__link--active { background: rgba(99,102,241,0.3); color: white; }
    .sidebar__link-icon { font-size: 1.1rem; flex-shrink: 0; }
    .sidebar__link-label { font-size: 0.9rem; font-weight: 500; }
    .sidebar__footer { padding: 1rem 0.5rem; border-top: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; gap: 0.5rem; }
    .sidebar__user { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; overflow: hidden; }
    .sidebar__avatar {
      width: 36px; height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: 700;
      flex-shrink: 0;
    }
    .sidebar__user-info { overflow: hidden; }
    .sidebar__user-name { color: white; font-size: 0.85rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sidebar__user-role { color: rgba(255,255,255,0.5); font-size: 0.75rem; }
    .sidebar__logout {
      background: rgba(239,68,68,0.15);
      border: 1px solid rgba(239,68,68,0.3);
      color: #fca5a5;
      border-radius: 8px;
      padding: 0.5rem;
      cursor: pointer;
      font-size: 0.85rem;
      text-align: center;
      transition: background 0.15s;
    }
    .sidebar__logout:hover { background: rgba(239,68,68,0.25); }
    .main-content { flex: 1; overflow-x: hidden; min-width: 0; }
  `]
})
export class AdminShellComponent {
  auth = inject(AuthService);
  private router = inject(Router);
  sidebarCollapsed = signal(false);

  navItems = [
    { path: '/admin/products', label: 'Products', icon: '📦' },
    { path: '/admin/orders',   label: 'Orders',   icon: '📋' },
    { path: '/admin/analytics',label: 'Analytics',icon: '📊' },
  ];

  initials(): string {
    const name = this.auth.currentUser()?.name ?? '';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }

  logout(): void {
    this.auth.logout();
  }
}
