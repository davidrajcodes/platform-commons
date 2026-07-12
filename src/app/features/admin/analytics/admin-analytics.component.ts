import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OrderService } from '../../../core/services/order.service';
import { Order } from '../../../core/models/order.model';
import { AppCurrencyPipe } from '../../../shared/pipes/app-currency.pipe';

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [AppCurrencyPipe],
  templateUrl: './admin-analytics.component.html',
  styleUrl: './admin-analytics.component.scss',
})
export class AdminAnalyticsComponent implements OnInit {
  private orderService = inject(OrderService);
  private destroyRef = inject(DestroyRef);

  orders = signal<Order[]>([]);

  kpis = computed(() => {
    const os = this.orders();
    const revenue = os.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + o.total, 0);
    const pending = os.filter(o => o.status === 'Pending').length;
    const avgOrder = os.length ? revenue / os.filter(o => o.status !== 'Cancelled').length : 0;
    return [
      { label: 'Total Revenue', value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(revenue), icon: '💰' },
      { label: 'Total Orders', value: os.length.toString(), icon: '📋' },
      { label: 'Pending Orders', value: pending.toString(), icon: '⏳' },
      { label: 'Avg Order Value', value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(avgOrder), icon: '📈' },
    ];
  });

  statusBreakdown = computed(() => {
    const os = this.orders();
    if (!os.length) return [];
    const counts: Record<string, number> = {};
    os.forEach(o => { counts[o.status] = (counts[o.status] ?? 0) + 1; });
    const max = Math.max(...Object.values(counts));
    return Object.entries(counts).map(([status, count]) => ({
      status, count, pct: Math.round((count / max) * 100)
    }));
  });

  topCustomers = computed(() => {
    const map = new Map<string, { name: string; orderCount: number; total: number }>();
    this.orders().forEach(o => {
      const prev = map.get(o.customerId) ?? { name: o.customerName, orderCount: 0, total: 0 };
      map.set(o.customerId, { ...prev, orderCount: prev.orderCount + 1, total: prev.total + o.total });
    });
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 5);
  });

  last7Days = computed(() => {
    const days: { date: string; dayLabel: string; revenue: number; pct: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
      const revenue = this.orders()
        .filter(o => o.createdAt.startsWith(dateStr) && o.status !== 'Cancelled')
        .reduce((s, o) => s + o.total, 0);
      days.push({ date: dateStr, dayLabel, revenue, pct: 0 });
    }
    const maxRev = Math.max(...days.map(d => d.revenue), 1);
    return days.map(d => ({ ...d, pct: Math.round((d.revenue / maxRev) * 100) }));
  });

  ngOnInit(): void {
    this.orderService.getOrders().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(orders => this.orders.set(orders));
  }
}
