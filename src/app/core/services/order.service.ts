import { Injectable, signal, computed } from '@angular/core';
import { Observable, of, delay, throwError } from 'rxjs';
import { Order, OrderStatus, OrderItem } from '../models/order.model';
import { CartItem } from '../models/cart.model';

function generateId(): string {
  return 'ORD-' + Math.random().toString(36).slice(2, 10).toUpperCase();
}

const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-ABC123',
    customerId: '3',
    customerName: 'Carol User',
    customerEmail: 'user1@platform.com',
    items: [
      { productId: 1, productTitle: 'iPhone 9', productThumbnail: 'https://cdn.dummyjson.com/products/images/smartphones/iPhone%209/1.png', quantity: 1, price: 549 },
      { productId: 2, productTitle: 'iPhone X', productThumbnail: 'https://cdn.dummyjson.com/products/images/smartphones/iPhone%20X/1.png', quantity: 1, price: 899 }
    ],
    subtotal: 1448,
    tax: 144.8,
    total: 1592.8,
    status: 'Confirmed',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    deliveryAddress: { address: '123 Main St', city: 'New York', state: 'NY', zipCode: '10001', country: 'United States' }
  },
  {
    id: 'ORD-DEF456',
    customerId: '4',
    customerName: 'Dave User',
    customerEmail: 'user2@platform.com',
    items: [
      { productId: 5, productTitle: 'Huawei P30', productThumbnail: 'https://cdn.dummyjson.com/products/images/smartphones/Huawei%20P30/1.png', quantity: 2, price: 499 }
    ],
    subtotal: 998,
    tax: 99.8,
    total: 1097.8,
    status: 'Pending',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    deliveryAddress: { address: '456 Oak Ave', city: 'Los Angeles', state: 'CA', zipCode: '90001', country: 'United States' }
  },
  {
    id: 'ORD-GHI789',
    customerId: '3',
    customerName: 'Carol User',
    customerEmail: 'user1@platform.com',
    items: [
      { productId: 10, productTitle: 'Apple Watch Series 7', productThumbnail: 'https://cdn.dummyjson.com/products/images/watches/Apple%20Watch%20Series%207/1.png', quantity: 1, price: 399 }
    ],
    subtotal: 399,
    tax: 39.9,
    total: 438.9,
    status: 'Cancelled',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    deliveryAddress: { address: '123 Main St', city: 'New York', state: 'NY', zipCode: '10001', country: 'United States' }
  }
];

@Injectable({ providedIn: 'root' })
export class OrderService {
  // Signal store — single source of truth for all orders
  private _orders = signal<Order[]>(MOCK_ORDERS);
  readonly orders = this._orders.asReadonly();

  getOrders(): Observable<Order[]> {
    return of(this._orders()).pipe(delay(300));
  }

  getOrderById(id: string): Observable<Order | undefined> {
    return of(this._orders().find(o => o.id === id)).pipe(delay(200));
  }

  getOrdersByCustomer(customerId: string): Observable<Order[]> {
    return of(this._orders().filter(o => o.customerId === customerId)).pipe(delay(200));
  }

  updateOrderStatus(id: string, status: OrderStatus): Observable<Order> {
    const order = this._orders().find(o => o.id === id);
    if (!order) return throwError(() => new Error('Order not found'));
    const updated = { ...order, status };
    this._orders.update(orders => orders.map(o => o.id === id ? updated : o));
    return of(updated).pipe(delay(200));
  }

  placeOrder(
    customerId: string,
    customerName: string,
    customerEmail: string,
    items: CartItem[],
    deliveryAddress: Record<string, string>,
    taxRate = 0.1
  ): Observable<Order> {
    const orderItems: OrderItem[] = items.map(ci => ({
      productId: ci.product.id,
      productTitle: ci.product.title,
      productThumbnail: ci.product.thumbnail,
      quantity: ci.quantity,
      price: ci.product.price,
    }));
    const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const tax = +(subtotal * taxRate).toFixed(2);
    const order: Order = {
      id: generateId(),
      customerId,
      customerName,
      customerEmail,
      items: orderItems,
      subtotal: +subtotal.toFixed(2),
      tax,
      total: +(subtotal + tax).toFixed(2),
      status: 'Pending',
      createdAt: new Date().toISOString(),
      deliveryAddress,
    };
    // Simulate ~10% failure rate for demo rollback
    if (Math.random() < 0.1) {
      return throwError(() => new Error('Payment gateway error. Please try again.'));
    }
    this._orders.update(orders => [order, ...orders]);
    return of(order).pipe(delay(800));
  }
}
