import {
  Component, OnInit, inject, signal, computed, DestroyRef, Input,
  DOCUMENT
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
import { CardInputComponent } from '../card-input/card-input.component';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, DynamicFormComponent, AppCurrencyPipe, CardInputComponent],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss'
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
  documentRef = inject(DOCUMENT);

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
    this.http.get<FormFieldConfig[]>(`${this.documentRef.baseURI}assets/checkout-form.json`).pipe(
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
