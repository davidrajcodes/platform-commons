import {
  Component, OnInit, inject, signal, computed, DestroyRef, Input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators, ControlValueAccessor, NG_VALUE_ACCESSOR, NG_VALIDATORS, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CartService } from '../../../core/services/cart.service';
import { OrderService } from '../../../core/services/order.service';
import { AuthService } from '../../../core/services/auth.service';
import { CheckoutStateService } from '../../../core/services/checkout-state.service';
import { ToastService } from '../../../core/services/toast.service';
import { DynamicFormComponent, FormFieldConfig } from '../../../shared/components/dynamic-form.component';
import { AppCurrencyPipe } from '../../../shared/pipes/app-currency.pipe';
import { luhnValidator } from '../../../shared/pipes/luhn.validator';

/**
 * Custom ControlValueAccessor for card number input.
 * Formats in groups of 4, validates via Luhn algorithm.
 */
@Component({
  selector: 'app-card-input',
  standalone: true,
  imports: [ReactiveFormsModule],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: CardInputComponent, multi: true },
    { provide: NG_VALIDATORS, useExisting: CardInputComponent, multi: true },
  ],
  template: `
    <div class="card-field">
      <input
        type="text"
        [value]="displayValue()"
        (input)="onInput($event)"
        (blur)="onTouched()"
        placeholder="1234 5678 9012 3456"
        maxlength="19"
        class="card-input"
        [class.card-input--error]="hasError()"
        autocomplete="cc-number"
        inputmode="numeric"
      />
      <div class="card-brand">{{ cardBrand() }}</div>
    </div>
  `,
  styles: [`
    .card-field { position: relative; }
    .card-input {
      width: 100%; padding: 0.7rem 3rem 0.7rem 1rem;
      border: 1.5px solid #d1d5db; border-radius: 8px;
      font-size: 1rem; font-family: monospace; letter-spacing: 2px; outline: none;
      box-sizing: border-box;
    }
    .card-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
    .card-input--error { border-color: #ef4444; }
    .card-brand { position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); font-size: 1.25rem; }
  `]
})
export class CardInputComponent implements ControlValueAccessor {
  private rawValue = signal('');
  hasError = signal(false);

  displayValue = computed(() => {
    return this.rawValue().replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
  });

  cardBrand = computed(() => {
    const num = this.rawValue().replace(/\D/g, '');
    if (num.startsWith('4')) return '💳';
    if (/^5[1-5]/.test(num)) return '💳';
    if (num.startsWith('3')) return '💳';
    return '💳';
  });

  private onChange = (_: string) => {};
  onTouched = () => {};

  onInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 16);
    this.rawValue.set(raw);
    this.onChange(raw);
  }

  writeValue(value: string): void {
    this.rawValue.set(value ?? '');
  }

  registerOnChange(fn: (v: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }

  validate(control: AbstractControl): ValidationErrors | null {
    this.hasError.set(!!(control.errors));
    return luhnValidator()(control);
  }
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, DynamicFormComponent, AppCurrencyPipe, CardInputComponent],
  template: `
    <div class="checkout">
      <!-- Step indicator -->
      <div class="steps-bar">
        @for (s of steps; track s.n) {
          <div class="step" [class.step--active]="currentStep() === s.n" [class.step--done]="currentStep() > s.n">
            <div class="step__circle">{{ currentStep() > s.n ? '✓' : s.n }}</div>
            <div class="step__label">{{ s.label }}</div>
          </div>
          @if (!$last) { <div class="step__line"></div> }
        }
      </div>

      <div class="checkout__layout">
        <!-- Main form area -->
        <div class="checkout__main">

          <!-- Step 1: Cart Review -->
          @if (currentStep() === 1) {
            <div class="checkout-card">
              <h2 class="section-title">Your Cart</h2>
              @if (cartItems().length === 0) {
                <div class="empty-cart">Your cart is empty. <a routerLink="/shop/catalogue">Browse products</a></div>
              } @else {
                @for (item of cartItems(); track item.product.id) {
                  <div class="cart-item">
                    <img [src]="item.product.thumbnail" [alt]="item.product.title" class="cart-item__img" />
                    <div class="cart-item__info">
                      <div class="cart-item__title">{{ item.product.title }}</div>
                      <div class="cart-item__price">{{ item.product.price | appCurrency }} each</div>
                    </div>
                    <div class="cart-item__qty">
                      <button class="qty-btn" (click)="updateQty(item.product.id, item.quantity - 1)">−</button>
                      <span class="qty-value">{{ item.quantity }}</span>
                      <button class="qty-btn" (click)="updateQty(item.product.id, item.quantity + 1)" [disabled]="item.quantity >= item.product.stock">+</button>
                    </div>
                    <div class="cart-item__subtotal">{{ (item.product.price * item.quantity) | appCurrency }}</div>
                    <button class="remove-btn" (click)="removeItem(item.product.id)">🗑️</button>
                  </div>
                }
                <button class="btn-primary" (click)="proceedToStep(2)">
                  Continue to Delivery →
                </button>
              }
            </div>
          }

          <!-- Step 2: Delivery Details -->
          @if (currentStep() === 2) {
            <div class="checkout-card">
              <h2 class="section-title">Delivery Details</h2>
              <app-dynamic-form [fields]="deliveryFields" [formGroup]="deliveryForm" />
              <div class="step-actions">
                <button class="btn-secondary" (click)="goToStep(1)">← Back</button>
                <button class="btn-primary" (click)="proceedToStep(3)" [disabled]="deliveryForm.invalid">
                  Continue to Payment →
                </button>
              </div>
            </div>
          }

          <!-- Step 3: Payment -->
          @if (currentStep() === 3) {
            <div class="checkout-card">
              <h2 class="section-title">Payment Details</h2>
              <form [formGroup]="paymentForm" class="payment-form" novalidate>
                <div class="form-group">
                  <label class="form-label">Card Number *</label>
                  <app-card-input formControlName="cardNumber" />
                  @if (paymentForm.get('cardNumber')?.invalid && paymentForm.get('cardNumber')?.touched) {
                    <span class="form-error">{{ getCardError() }}</span>
                  }
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Expiry *</label>
                    <input type="text" formControlName="expiry" placeholder="MM/YY" class="form-input" maxlength="5" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">CVV *</label>
                    <input type="text" formControlName="cvv" placeholder="•••" class="form-input" maxlength="4" />
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Name on Card *</label>
                  <input type="text" formControlName="nameOnCard" placeholder="As it appears on your card" class="form-input" />
                </div>

                <!-- Billing same as delivery toggle -->
                <div class="toggle-row">
                  <label class="toggle-label">
                    <input type="checkbox" formControlName="sameAsDelivery" />
                    Billing address same as delivery
                  </label>
                </div>

                @if (!paymentForm.get('sameAsDelivery')?.value) {
                  <div class="billing-fields">
                    <h3 class="sub-heading">Billing Address</h3>
                    <div class="form-group">
                      <label class="form-label">Street Address</label>
                      <input type="text" formControlName="billingAddress" class="form-input" placeholder="123 Main St" />
                    </div>
                    <div class="form-row">
                      <div class="form-group">
                        <label class="form-label">City</label>
                        <input type="text" formControlName="billingCity" class="form-input" />
                      </div>
                      <div class="form-group">
                        <label class="form-label">ZIP</label>
                        <input type="text" formControlName="billingZip" class="form-input" />
                      </div>
                    </div>
                  </div>
                }
              </form>

              <div class="step-actions">
                <button class="btn-secondary" (click)="goToStep(2)">← Back</button>
                <button
                  class="btn-primary btn-primary--submit"
                  (click)="submitOrder()"
                  [disabled]="paymentForm.invalid || submitting()"
                >
                  {{ submitting() ? 'Processing…' : 'Place Order' }}
                </button>
              </div>
            </div>
          }
        </div>

        <!-- Order Summary -->
        <div class="checkout__summary">
          <div class="summary-card">
            <h3 class="summary-title">Order Summary</h3>
            <div class="summary-items">
              @for (item of cartItems(); track item.product.id) {
                <div class="summary-row">
                  <span class="summary-item-name">{{ item.product.title }} ×{{ item.quantity }}</span>
                  <span>{{ (item.product.price * item.quantity) | appCurrency }}</span>
                </div>
              }
            </div>
            <div class="summary-divider"></div>
            <div class="summary-row">
              <span>Subtotal</span><span>{{ cartService.subtotal() | appCurrency }}</span>
            </div>
            <div class="summary-row">
              <span>Tax (10%)</span><span>{{ cartService.tax() | appCurrency }}</span>
            </div>
            <div class="summary-row summary-row--total">
              <span>Total</span><span>{{ cartService.total() | appCurrency }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .checkout { max-width: 960px; margin: 0 auto; }
    .steps-bar { display: flex; align-items: center; margin-bottom: 2rem; }
    .step { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; }
    .step__circle {
      width: 32px; height: 32px; border-radius: 50%; background: #e5e7eb;
      color: #9ca3af; display: flex; align-items: center; justify-content: center;
      font-size: 0.85rem; font-weight: 700; transition: background 0.2s, color 0.2s;
    }
    .step--active .step__circle { background: #6366f1; color: white; }
    .step--done .step__circle { background: #10b981; color: white; }
    .step__label { font-size: 0.78rem; color: #9ca3af; font-weight: 500; white-space: nowrap; }
    .step--active .step__label, .step--done .step__label { color: #374151; }
    .step__line { flex: 1; height: 2px; background: #e5e7eb; margin: 0 0.5rem; margin-bottom: 1.25rem; }
    .checkout__layout { display: grid; grid-template-columns: 1fr 320px; gap: 1.5rem; align-items: start; }
    @media (max-width: 680px) { .checkout__layout { grid-template-columns: 1fr; } }
    .checkout-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .section-title { font-size: 1.1rem; font-weight: 700; color: #1f2937; margin: 0 0 1.25rem; }
    .empty-cart { color: #6b7280; text-align: center; padding: 2rem 0; }
    .empty-cart a { color: #6366f1; text-decoration: none; }
    .cart-item { display: flex; align-items: center; gap: 0.875rem; padding: 0.875rem 0; border-bottom: 1px solid #f3f4f6; }
    .cart-item:last-of-type { border-bottom: none; }
    .cart-item__img { width: 56px; height: 56px; border-radius: 8px; object-fit: cover; border: 1px solid #e5e7eb; flex-shrink: 0; }
    .cart-item__info { flex: 1; }
    .cart-item__title { font-size: 0.9rem; font-weight: 500; color: #1f2937; }
    .cart-item__price { font-size: 0.8rem; color: #9ca3af; }
    .cart-item__qty { display: flex; align-items: center; gap: 0.25rem; }
    .qty-btn { background: #f3f4f6; border: none; border-radius: 6px; width: 28px; height: 28px; cursor: pointer; font-size: 1rem; }
    .qty-btn:disabled { opacity: 0.4; }
    .qty-value { width: 28px; text-align: center; font-size: 0.9rem; font-weight: 600; }
    .cart-item__subtotal { font-weight: 700; color: #1f2937; font-size: 0.9rem; min-width: 64px; text-align: right; }
    .remove-btn { background: none; border: none; cursor: pointer; font-size: 1rem; opacity: 0.5; }
    .remove-btn:hover { opacity: 1; }
    .btn-primary {
      margin-top: 1.25rem; width: 100%; padding: 0.875rem;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white; border: none; border-radius: 10px;
      font-size: 1rem; font-weight: 600; cursor: pointer; transition: opacity 0.2s;
    }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary:hover:not(:disabled) { opacity: 0.9; }
    .btn-primary--submit { background: linear-gradient(135deg, #10b981, #059669); }
    .btn-secondary {
      padding: 0.7rem 1.25rem; background: white; border: 1.5px solid #d1d5db;
      border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; color: #374151;
    }
    .step-actions { display: flex; justify-content: space-between; gap: 0.75rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; }
    .payment-form { display: flex; flex-direction: column; gap: 1.1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
    .form-label { font-size: 0.875rem; font-weight: 600; color: #374151; }
    .form-input { padding: 0.65rem 0.875rem; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 0.9rem; outline: none; }
    .form-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-error { font-size: 0.8rem; color: #ef4444; }
    .toggle-row { display: flex; }
    .toggle-label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; cursor: pointer; color: #374151; }
    .billing-fields { border-top: 1px dashed #e5e7eb; padding-top: 1rem; display: flex; flex-direction: column; gap: 1rem; }
    .sub-heading { font-size: 0.9rem; font-weight: 700; color: #374151; margin: 0; }
    .summary-card { background: white; border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.08); position: sticky; top: 80px; }
    .summary-title { font-size: 1rem; font-weight: 700; color: #1f2937; margin: 0 0 1rem; }
    .summary-items { display: flex; flex-direction: column; gap: 0.5rem; max-height: 220px; overflow-y: auto; }
    .summary-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem; color: #6b7280; }
    .summary-item-name { flex: 1; margin-right: 0.5rem; font-size: 0.82rem; }
    .summary-divider { height: 1px; background: #e5e7eb; margin: 0.75rem 0; }
    .summary-row--total { font-weight: 700; color: #1f2937; font-size: 1rem; padding-top: 0.5rem; border-top: 1px solid #e5e7eb; }
  `]
})
export class CheckoutComponent implements OnInit {
  cartService = inject(CartService);
  private orderService = inject(OrderService);
  private auth = inject(AuthService);
  private checkoutState = inject(CheckoutStateService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  currentStep = signal(1);
  submitting = signal(false);
  cartItems = this.cartService.items;

  deliveryFields: FormFieldConfig[] = [];
  deliveryForm: FormGroup = this.fb.group({});

  paymentForm: FormGroup = this.fb.group({
    cardNumber: ['', [Validators.required, luhnValidator()]],
    expiry: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]],
    cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
    nameOnCard: ['', Validators.required],
    sameAsDelivery: [true],
    billingAddress: [''],
    billingCity: [''],
    billingZip: [''],
  });

  steps = [
    { n: 1, label: 'Cart Review' },
    { n: 2, label: 'Delivery' },
    { n: 3, label: 'Payment' },
  ];

  ngOnInit(): void {
    const stepParam = Number(this.route.snapshot.paramMap.get('n') ?? 1);
    this.currentStep.set(stepParam);

    // Load checkout form config from assets
    this.http.get<FormFieldConfig[]>('/assets/checkout-form.json').pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(fields => {
      this.deliveryFields = fields;
      // Build FormGroup from field config
      const group: Record<string, FormControl> = {};
      fields.forEach(f => { group[f.name] = this.fb.control(''); });
      this.deliveryForm = this.fb.group(group);
    });
  }

  goToStep(step: number): void {
    this.router.navigate(['/shop/checkout/step', step]);
    this.currentStep.set(step);
  }

  proceedToStep(step: number): void {
    if (step === 2 && this.cartItems().length === 0) {
      this.router.navigate(['/shop']);
      return;
    }
    this.checkoutState.completeStep(step - 1);
    this.goToStep(step);
  }

  updateQty(productId: number, qty: number): void {
    this.cartService.updateQuantity(productId, qty);
  }

  removeItem(productId: number): void {
    this.cartService.removeItem(productId);
    if (this.cartItems().length === 0) this.router.navigate(['/shop']);
  }

  submitOrder(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }
    this.submitting.set(true);

    const user = this.auth.currentUser()!;
    const deliveryData = this.deliveryForm.value as Record<string, string>;

    this.orderService.placeOrder(
      user.userId,
      user.name,
      user.email,
      this.cartItems(),
      deliveryData,
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (order) => {
        this.submitting.set(false);
        this.cartService.clear();
        this.checkoutState.reset();
        this.toast.success('Order placed successfully!');
        this.router.navigate(['/shop/order-confirmation', order.id]);
      },
      error: (err: Error) => {
        this.submitting.set(false);
        this.toast.error(err.message ?? 'Order failed. Please try again.');
      }
    });
  }

  getCardError(): string {
    const errors = this.paymentForm.get('cardNumber')?.errors;
    if (!errors) return '';
    if (errors['required']) return 'Card number is required.';
    if (errors['luhn']) return errors['luhn'];
    return 'Invalid card number.';
  }
}
