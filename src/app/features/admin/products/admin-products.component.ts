import {
  Component, OnInit, inject, signal, computed, DestroyRef, ChangeDetectionStrategy
} from '@angular/core';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { Subject, combineLatest, of } from 'rxjs';
import { ProductService } from '../../../core/services/product.service';
import { ToastService } from '../../../core/services/toast.service';
import { Product } from '../../../core/models/product.model';
import { AppCurrencyPipe } from '../../../shared/pipes/app-currency.pipe';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, AppCurrencyPipe],
  templateUrl: './admin-products.component.html',
  styleUrl: './admin-products.component.scss',
})
export class AdminProductsComponent implements OnInit {
  private productService = inject(ProductService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  products = signal<Product[]>([]);
  categories = signal<string[]>([]);
  loading = signal(true);
  total = signal(0);
  page = signal(1);
  limit = 10;

  sortBy = signal('');
  sortOrder = signal<'asc' | 'desc'>('asc');
  searchTerm = signal('');
  selectedCategory = signal('');

  // Stock overrides from WebSocket stream
  stockOverrides = signal<Map<number, number>>(new Map());

  showModal = signal(false);
  editingProduct = signal<Product | null>(null);
  formSubmitting = signal(false);

  productForm: FormGroup = this.fb.group({
    title: ['', Validators.required],
    category: ['', Validators.required],
    price: [null, [Validators.required, Validators.min(0)]],
    stock: [null, [Validators.required, Validators.min(0)]],
    description: [''],
  });

  private search$ = new Subject<string>();
  private category$ = new Subject<string>();

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit)));

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();

    // Subscribe to stock updates (shared WebSocket stream)
    this.productService.stockUpdates$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({ id, stock }) => {
      this.stockOverrides.update(map => new Map(map).set(id, stock));
    });
  }

  getStock(id: number): number {
    const product = this.products().find(p => p.id === id);
    return this.stockOverrides().get(id) ?? product?.stock ?? 0;
  }

  onSearch(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchTerm.set(val);
    this.page.set(1);
    this.loadProducts();
  }

  onCategory(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedCategory.set(val);
    this.page.set(1);
    this.loadProducts();
  }

  sort(field: string): void {
    if (this.sortBy() === field) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(field);
      this.sortOrder.set('asc');
    }
    this.loadProducts();
  }

  getSortIcon(field: string): string {
    if (this.sortBy() !== field) return '↕';
    return this.sortOrder() === 'asc' ? '↑' : '↓';
  }

  prevPage(): void { this.page.update(p => p - 1); this.loadProducts(); }
  nextPage(): void { this.page.update(p => p + 1); this.loadProducts(); }

  openForm(product?: Product): void {
    this.editingProduct.set(product ?? null);
    if (product) {
      this.productForm.patchValue(product);
    } else {
      this.productForm.reset();
    }
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingProduct.set(null);
    this.productForm.reset();
  }

  submitForm(): void {
    if (this.productForm.invalid) return;
    this.formSubmitting.set(true);
    const data = this.productForm.value;
    const editing = this.editingProduct();

    const obs = editing
      ? this.productService.updateProduct(editing.id, data)
      : this.productService.addProduct(data);

    obs.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.formSubmitting.set(false);
        this.toast.success(editing ? 'Product updated!' : 'Product added!');
        this.closeModal();
        this.loadProducts();
      },
      error: () => {
        this.formSubmitting.set(false);
        this.toast.error('Failed to save product.');
      }
    });
  }

  deleteProduct(product: Product): void {
    // Optimistic UI — remove immediately
    this.products.update(list => list.filter(p => p.id !== product.id));
    this.toast.info(`Deleting "${product.title}"…`);

    this.productService.deleteProduct(product.id).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => this.toast.success('Product deleted.'),
      error: () => {
        // Roll back
        this.products.update(list => [product, ...list]);
        this.toast.error('Delete failed — product restored.');
      }
    });
  }

  private loadProducts(): void {
    this.loading.set(true);
    this.productService.getProducts({
      search: this.searchTerm() || undefined,
      category: this.selectedCategory() || undefined,
      page: this.page(),
      limit: this.limit,
      sortBy: this.sortBy() || undefined,
      sortOrder: this.sortOrder(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        this.products.set(res.products);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Failed to load products.');
      }
    });
  }

  private loadCategories(): void {
    this.productService.getCategories().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(cats => this.categories.set(cats));
  }
}
