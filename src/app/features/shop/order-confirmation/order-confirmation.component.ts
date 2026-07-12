import {
  Component, OnInit, inject, signal, DestroyRef
} from '@angular/core';

import { RouterLink, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OrderService } from '../../../core/services/order.service';
import { Order } from '../../../core/models/order.model';
import { AppCurrencyPipe } from '../../../shared/pipes/app-currency.pipe';

@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [RouterLink, AppCurrencyPipe],
  templateUrl: './order-confirmation.component.html',
  styleUrl: './order-confirmation.component.scss',
})
export class OrderConfirmationComponent implements OnInit {
  private orderService = inject(OrderService);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  order = signal<Order | null>(null);
  loading = signal(true);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.orderService.getOrderById(id).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(order => {
      this.order.set(order ?? null);
      this.loading.set(false);
    });
  }

  addressLines(): string[] {
    const addr = this.order()?.deliveryAddress ?? {};
    return Object.values(addr).filter(Boolean);
  }
}
