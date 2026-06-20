import { Injectable, signal, computed, effect } from '@angular/core';
import { CartItem } from '../models/cart.model';
import { Product } from '../models/product.model';

const CART_KEY = 'platform_cart';
const TAX_RATE = 0.1;

@Injectable({ providedIn: 'root' })
export class CartService {
  private _items = signal<CartItem[]>(this.loadFromStorage());

  readonly items = this._items.asReadonly();

  readonly itemCount = computed(() =>
    this._items().reduce((sum, item) => sum + item.quantity, 0)
  );

  readonly subtotal = computed(() =>
    this._items().reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  );

  readonly tax = computed(() => +(this.subtotal() * TAX_RATE).toFixed(2));

  readonly total = computed(() => +(this.subtotal() + this.tax()).toFixed(2));

  constructor() {
    // Persist to localStorage on every change
    effect(() => {
      const items = this._items();
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    });
  }

  addItem(product: Product, quantity = 1): void {
    this._items.update(items => {
      const existing = items.find(i => i.product.id === product.id);
      if (existing) {
        return items.map(i =>
          i.product.id === product.id
            ? { ...i, quantity: Math.min(i.quantity + quantity, product.stock) }
            : i
        );
      }
      return [...items, { product, quantity: Math.min(quantity, product.stock) }];
    });
  }

  updateQuantity(productId: number, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }
    this._items.update(items =>
      items.map(i => i.product.id === productId ? { ...i, quantity } : i)
    );
  }

  removeItem(productId: number): void {
    this._items.update(items => items.filter(i => i.product.id !== productId));
  }

  clear(): void {
    this._items.set([]);
  }

  private loadFromStorage(): CartItem[] {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}
