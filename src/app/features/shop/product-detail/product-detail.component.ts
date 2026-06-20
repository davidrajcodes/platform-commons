import {
  Component, OnInit, inject, signal, computed, DestroyRef, Input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductService } from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart.service';
import { ToastService } from '../../../core/services/toast.service';
import { Product } from '../../../core/models/product.model';
import { AppCurrencyPipe } from '../../../shared/pipes/app-currency.pipe';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, AppCurrencyPipe],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss',
})
export class ProductDetailComponent implements OnInit {
  @Input() product!: Product;

  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  selectedImage = signal('');
  qty = signal(1);
  relatedProducts = signal<Product[]>([]);

  currentStock = computed(() => {
    const cached = this.productService.productCache().get(this.product?.id);
    return cached?.stock ?? this.product?.stock ?? 0;
  });

  starsDisplay(): string {
    const rating = this.product?.rating ?? 0;
    const full = Math.round(rating);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  }

  ngOnInit(): void {
    if (this.product) {
      this.selectedImage.set(this.product.thumbnail);
      this.loadRelated();
    }
  }

  adjustQty(delta: number): void {
    const next = this.qty() + delta;
    if (next >= 1 && next <= this.currentStock()) this.qty.set(next);
  }

  addToCart(): void {
    this.cartService.addItem(this.product, this.qty());
    this.toast.success(`${this.qty()}× "${this.product.title}" added to cart!`);
  }

  navigate(id: number): void {
    this.router.navigate(['/shop/products', id]);
  }

  private loadRelated(): void {
    this.productService.getRelatedProducts(this.product.category, this.product.id).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(products => this.relatedProducts.set(products));
  }
}
