import {
  Component, OnInit, inject, signal, computed, DestroyRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OrderService } from '../../../core/services/order.service';
import { Order, OrderStatus } from '../../../core/models/order.model';
import { AppCurrencyPipe } from '../../../shared/pipes/app-currency.pipe';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, AppCurrencyPipe],
  templateUrl: './admin-orders.component.html',
  styleUrl: './admin-orders.component.scss',
})
export class AdminOrdersComponent implements OnInit {
  private orderService = inject(OrderService);
  private destroyRef = inject(DestroyRef);

  allOrders = signal<Order[]>([]);
  loading = signal(true);
  statusFilter = signal<string>('All');
  selectedOrder = signal<Order | null>(null);
  page = signal(1);
  pageSize = 10;

  dateFrom = signal('');
  dateTo = signal('');

  sortField = signal('createdAt');
  sortDir = signal<'asc' | 'desc'>('desc');

  statusOptions = ['All', 'Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];
  orderStatuses: OrderStatus[] = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];

  filteredOrders = computed(() => {
    let orders = this.allOrders();

    const sf = this.statusFilter();

    if (sf !== 'All') {
      orders = orders.filter(o => o.status === sf);
    }

    if (this.dateFrom()) {
      orders = orders.filter(
        o => o.createdAt >= this.dateFrom()
      );
    }

    if (this.dateTo()) {
      orders = orders.filter(
        o => o.createdAt <= this.dateTo() + 'T23:59:59'
      );
    }

    const field = this.sortField() as keyof Order;
    const dir = this.sortDir() === 'asc' ? 1 : -1;

    return [...orders].sort((a, b) => {
      const av = a[field] as string | number;
      const bv = b[field] as string | number;

      return av < bv ? -dir : av > bv ? dir : 0;
    });
  });

  pagedOrders = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredOrders().slice(start, start + this.pageSize);
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredOrders().length / this.pageSize)));

  ngOnInit(): void {
    this.orderService.getOrders().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(orders => {
      this.allOrders.set(orders);
      this.loading.set(false);
    });
  }

  filterChanged(): void { this.page.set(1); }

  prevPage(): void { this.page.update(p => p - 1); }
  nextPage(): void { this.page.update(p => p + 1); }

  sort(field: string): void {
    if (this.sortField() === field) {
      this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set('asc');
    }
  }

  getSortIcon(field: string): string {
    if (this.sortField() !== field) return '↕';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  selectOrder(order: Order): void {
    this.selectedOrder.set(order);
  }

  updateStatus(order: Order, event: Event): void {
    const status = (event.target as HTMLSelectElement).value as OrderStatus;
    this.orderService.updateOrderStatus(order.id, status).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(updated => {
      this.allOrders.update(orders => orders.map(o => o.id === updated.id ? updated : o));
      this.selectedOrder.set(updated);
    });
  }

  getAddressEntries(order: Order): { key: string; value: string }[] {
    return Object.entries(order.deliveryAddress).map(([key, value]) => ({ key, value }));
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  resetFilters(): void {
    this.statusFilter.set('All');

    this.dateFrom.set('');
    this.dateTo.set('');

    this.page.set(1);
    this.sortField.set('createdAt');
    this.sortDir.set('desc');

    this.selectedOrder.set(null);
  }
}
