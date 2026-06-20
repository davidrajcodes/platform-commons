import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject, interval, map, tap, startWith, switchMap } from 'rxjs';
import { Product, ProductsResponse, ProductFilters } from '../models/product.model';

const API = 'https://dummyjson.com';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);

  // Stock update stream — shared by admin and shop (same stream, not duplicated)
  readonly stockUpdates$ = new Subject<{ id: number; stock: number }>();

  // Local product cache to support optimistic UI
  private _productCache = signal<Map<number, Product>>(new Map());
  readonly productCache = this._productCache.asReadonly();

  constructor() {
    this.startStockSimulation();
  }

  getProducts(filters: ProductFilters = {}): Observable<ProductsResponse> {
    const { search, category, page = 1, limit = 12, sortBy, sortOrder } = filters;
    const skip = (page - 1) * limit;

    let url = `${API}/products`;
    let params = new HttpParams().set('limit', limit).set('skip', skip);

    if (search) {
      url = `${API}/products/search`;
      params = params.set('q', search);
    } else if (category) {
      url = `${API}/products/category/${encodeURIComponent(category)}`;
    }

    if (sortBy) {
      params = params.set('sortBy', sortBy).set('order', sortOrder ?? 'asc');
    }

    return this.http.get<ProductsResponse>(url, { params }).pipe(
      tap(res => {
        const updated = new Map(this._productCache());
        res.products.forEach(p => updated.set(p.id, p));
        this._productCache.set(updated);
      })
    );
  }

  getProduct(id: number): Observable<Product> {
    return this.http.get<Product>(`${API}/products/${id}`).pipe(
      tap(p => {
        const updated = new Map(this._productCache());
        updated.set(p.id, p);
        this._productCache.set(updated);
      })
    );
  }

  getCategories(): Observable<string[]> {
    return this.http.get<{ slug: string; name: string; url: string }[]>(
      `${API}/products/categories`
    ).pipe(map(cats => cats.map(c => c.name)));
  }

  addProduct(product: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(`${API}/products/add`, product);
  }

  updateProduct(id: number, product: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${API}/products/${id}`, product).pipe(
      tap(p => {
        const updated = new Map(this._productCache());
        updated.set(p.id, p);
        this._productCache.set(updated);
      })
    );
  }

  deleteProduct(id: number): Observable<Product> {
    return this.http.delete<Product>(`${API}/products/${id}`);
  }

  getRelatedProducts(category: string, excludeId: number): Observable<Product[]> {
    return this.http.get<ProductsResponse>(
      `${API}/products/category/${encodeURIComponent(category)}`,
      { params: new HttpParams().set('limit', 5) }
    ).pipe(
      map(res => res.products.filter(p => p.id !== excludeId).slice(0, 4))
    );
  }

  private startStockSimulation(): void {
    // Simulate WebSocket — random stock updates every 4-8 mintues
    interval(50000).pipe(
      startWith(0),
      switchMap(() =>
        this.http.get<ProductsResponse>(`${API}/products?limit=10`).pipe(
          map(res => res.products)
        )
      )
    ).subscribe(products => {
      if (!products.length) return;
      const product = products[Math.floor(Math.random() * products.length)];
      const newStock = Math.max(0, product.stock + Math.floor(Math.random() * 11) - 5);
      this.stockUpdates$.next({ id: product.id, stock: newStock });

      const updated = new Map(this._productCache());
      const cached = updated.get(product.id);
      if (cached) {
        updated.set(product.id, { ...cached, stock: newStock });
        this._productCache.set(updated);
      }
    });
  }
}
