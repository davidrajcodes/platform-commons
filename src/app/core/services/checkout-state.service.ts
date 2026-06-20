import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CheckoutStateService {
  private _completedSteps = signal<Set<number>>(new Set());
  private _deliveryData = signal<Record<string, string> | null>(null);

  // readonly completedSteps = this._completedSteps.asReadonly();
  // readonly deliveryData = this._deliveryData.asReadonly();

  completeStep(step: number, data?: Record<string, string>): void {
    this._completedSteps.update(s => new Set([...s, step]));
    if (step === 2 && data) {
      this._deliveryData.set(data);
    }
  }

  isStepAccessible(step: number): boolean {
    if (step === 1) return true;
    return this._completedSteps().has(step - 1);
  }

  reset(): void {
    this._completedSteps.set(new Set());
    this._deliveryData.set(null);
  }
}
