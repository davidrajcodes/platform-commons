import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast toast--{{ toast.type }}" (click)="toastService.dismiss(toast.id)">
          <span class="toast__icon">
            @switch (toast.type) {
              @case ('success') { ✅ }
              @case ('error') { ❌ }
              @case ('warning') { ⚠️ }
              @default { ℹ️ }
            }
          </span>
          <span class="toast__msg">{{ toast.message }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .toast {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      border-radius: 8px;
      color: white;
      font-size: 0.9rem;
      cursor: pointer;
      animation: slideIn 0.3s ease;
      min-width: 260px;
      max-width: 380px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }
    .toast--success { background: #22c55e; }
    .toast--error { background: #ef4444; }
    .toast--warning { background: #f59e0b; }
    .toast--info { background: #3b82f6; }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(40px); }
      to { opacity: 1; transform: translateX(0); }
    }
  `]
})
export class ToastContainerComponent {
  toastService = inject(ToastService);
}
