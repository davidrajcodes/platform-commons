import {
  Component, OnInit, OnDestroy, inject, signal, computed, DestroyRef, ChangeDetectionStrategy, Input
} from '@angular/core';

import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject, combineLatest } from 'rxjs';
import { ProductService } from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart.service';
import { ToastService } from '../../../core/services/toast.service';
import { Product } from '../../../core/models/product.model';
import { AppCurrencyPipe } from '../../../shared/pipes/app-currency.pipe';

/**
 * ProductCardComponent — OnPush for performance. Only re-renders when
 * @Input() reference changes or signals are read from injected services.
 * The stock badge reads directly from the shared signal, so it updates
 * reactively without any @Input() change.
 */
@Component({
  selector: 'app-product-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppCurrencyPipe],
  template: `
    <div class="card" (click)="navigateToDetail()">
      <div class="card__image-wrap">
        <img [src]="product.thumbnail" [alt]="product.title" class="card__image" loading="lazy" />
        @if (currentStock() === 0) {
          <div class="card__out-of-stock">Out of Stock</div>
        }
        <!-- Live stock badge from shared WebSocket stream -->
        <div class="card__stock-badge" [class.card__stock-badge--low]="currentStock() < 10 && currentStock() > 0">
          {{ currentStock() > 0 ? currentStock() + ' left' : 'Sold out' }}
        </div>
      </div>
      <div class="card__body">
        <div class="card__category">{{ product.category }}</div>
        <h3 class="card__title">{{ product.title }}</h3>
        <div class="card__footer">
          <span class="card__price">{{ product.price | appCurrency }}</span>
          <div class="card__rating">⭐ {{ product.rating }}</div>
        </div>
        <button
          class="card__add-btn"
          [disabled]="currentStock() === 0"
          (click)="$event.stopPropagation(); addToCart()"
        >
          {{ currentStock() === 0 ? 'Notify Me' : 'Add to Cart' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .card {
      background: white; border-radius: 12px; overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      transition: transform 0.2s, box-shadow 0.2s; cursor: pointer;
    }
    .card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
    .card__image-wrap { position: relative; padding-top: 75%; overflow: hidden; background: #f9fafb; }
    .card__image { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    .card__out-of-stock {
      position: absolute; inset: 0; background: rgba(0,0,0,0.45);
      display: flex; align-items: center; justify-content: center;
      color: white; font-weight: 700; font-size: 0.9rem;
    }
    .card__stock-badge {
      position: absolute; top: 8px; right: 8px;
      background: #dcfce7; color: #166534;
      font-size: 0.72rem; font-weight: 700;
      padding: 0.2rem 0.5rem; border-radius: 999px;
    }
    .card__stock-badge--low { background: #fef3c7; color: #92400e; }
    .card__body { padding: 0.875rem; display: flex; flex-direction: column; gap: 0.35rem; }
    .card__category { font-size: 0.75rem; color: #9ca3af; text-transform: capitalize; }
    .card__title { font-size: 0.9rem; font-weight: 600; color: #1f2937; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .card__footer { display: flex; align-items: center; justify-content: space-between; }
    .card__price { font-size: 1rem; font-weight: 700; color: #6366f1; }
    .card__rating { font-size: 0.8rem; color: #6b7280; }
    .card__add-btn {
      width: 100%; padding: 0.55rem;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white; border: none; border-radius: 8px;
      font-size: 0.85rem; font-weight: 600; cursor: pointer;
      transition: opacity 0.2s; margin-top: 0.25rem;
    }
    .card__add-btn:disabled { opacity: 0.5; cursor: not-allowed; background: #9ca3af; }
    .card__add-btn:hover:not(:disabled) { opacity: 0.9; }
  `]
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;
  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private toast = inject(ToastService);
  private router = inject(Router);

  // Read live stock from the shared cache signal
  currentStock = computed(() => {
    const cached = this.productService.productCache().get(this.product?.id);
    return cached?.stock ?? this.product?.stock ?? 0;
  });

  navigateToDetail(): void {
    this.router.navigate(['/shop/products', this.product.id]);
  }

  addToCart(): void {
    this.cartService.addItem(this.product);
    this.toast.success(`"${this.product.title}" added to cart!`);
  }
}

@Component({
  selector: 'app-catalogue',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ProductCardComponent],
  templateUrl:'./catalogue.component.html',
  styleUrl:'./catalogue.component.scss'
})
export class CatalogueComponent implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  products = signal<Product[]>([]);
  categories = signal<string[]>([]);
  loading = signal(true);
  total = signal(0);
  page = signal(1);
  limit = 12;

  searchValue = signal('');
  selectedCategories = signal<Set<string>>(new Set());
  maxPrice = signal(2000);
  inStockOnly = signal(false);
  sortBy = signal('');
  sortOrder = signal<'asc' | 'desc'>('asc');

  private searchSubject = new Subject<string>();

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit)));
  hasActiveFilters = computed(() =>
    this.searchValue() !== '' || this.selectedCategories().size > 0 || this.maxPrice() < 2000 || this.inStockOnly()
  );

  private observer?: PerformanceObserver;

  ngOnInit(): void {
    // Attach PerformanceObserver for LCP/CLS monitoring
    this.attachPerformanceObserver();

    this.productService.getCategories().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(cats => this.categories.set(cats));

    // Debounced search
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => { this.page.set(1); this.loadProducts(); });

    // Restore filters from URL
    const params = this.route.snapshot.queryParamMap;
    if (params.get('search')) this.searchValue.set(params.get('search')!);
    if (params.get('category')) this.selectedCategories.set(new Set([params.get('category')!]));
    if (params.get('maxPrice')) this.maxPrice.set(Number(params.get('maxPrice')));
    if (params.get('inStock') === 'true') this.inStockOnly.set(true);

    this.loadProducts();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  onSearch(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchValue.set(val);
    this.updateUrlParams();
    this.searchSubject.next(val);
  }

  toggleCategory(cat: string): void {
    this.selectedCategories.update(set => {
      const next = new Set(set);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
    this.page.set(1);
    this.updateUrlParams();
    this.loadProducts();
  }

  clearCategories(): void {
    this.selectedCategories.set(new Set());
    this.page.set(1);
    this.updateUrlParams();
    this.loadProducts();
  }

  onPriceChange(event: Event): void {
    this.maxPrice.set(Number((event.target as HTMLInputElement).value));
    this.page.set(1);
    this.updateUrlParams();
    this.loadProducts();
  }

  onSort(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    if (!val) { this.sortBy.set(''); return; }
    const [field, dir] = val.split('-');
    this.sortBy.set(field);
    this.sortOrder.set(dir as 'asc' | 'desc');
    this.loadProducts();
  }

  clearSearch(): void { this.searchValue.set(''); this.page.set(1); this.updateUrlParams(); this.loadProducts(); }
  clearAll(): void {
    this.searchValue.set(''); this.selectedCategories.set(new Set());
    this.maxPrice.set(2000); this.inStockOnly.set(false);
    this.page.set(1); this.updateUrlParams(); this.loadProducts();
  }

  prevPage(): void { this.page.update(p => p - 1); this.loadProducts(); }
  nextPage(): void { this.page.update(p => p + 1); this.loadProducts(); }

  loadProducts(): void {
    this.loading.set(true);
    const cats = [...this.selectedCategories()];
    this.productService.getProducts({
      search: this.searchValue() || undefined,
      category: cats.length === 1 ? cats[0] : undefined,
      page: this.page(),
      limit: this.limit,
      sortBy: this.sortBy() || undefined,
      sortOrder: this.sortOrder(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        let products = res.products;
        // Client-side filters not supported by API
        if (this.inStockOnly()) products = products.filter(p => p.stock > 0);
        if (this.maxPrice() < 2000) products = products.filter(p => p.price <= this.maxPrice());
        this.products.set(products);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  private updateUrlParams(): void {
    const params: Record<string, string> = {};
    if (this.searchValue()) params['search'] = this.searchValue();
    if (this.selectedCategories().size > 0) params['category'] = [...this.selectedCategories()][0];
    if (this.maxPrice() < 2000) params['maxPrice'] = String(this.maxPrice());
    if (this.inStockOnly()) params['inStock'] = 'true';
    this.router.navigate([], { queryParams: params, replaceUrl: true });
  }

  private attachPerformanceObserver(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;
    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            console.log('[Perf] LCP:', entry.startTime.toFixed(0), 'ms');
          }
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            console.log('[Perf] CLS contribution:', (entry as any).value?.toFixed(4));
          }
        }
      });
      this.observer.observe({ entryTypes: ['largest-contentful-paint', 'layout-shift'] });
    } catch (e) {
      // Browser may not support all entry types
    }
  }
}
