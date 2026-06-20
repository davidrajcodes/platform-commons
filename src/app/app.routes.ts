import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { checkoutStepGuard } from './core/guards/checkout-step.guard';
import { productResolver } from './core/guards/product.resolver';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then(m => m.LoginComponent),
  },

  // Admin routes — lazy loaded, admin-only
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/admin-shell.component').then(m => m.AdminShellComponent),
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'products', pathMatch: 'full' },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/admin/products/admin-products.component').then(m => m.AdminProductsComponent),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./features/admin/orders/admin-orders.component').then(m => m.AdminOrdersComponent),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./features/admin/analytics/admin-analytics.component').then(m => m.AdminAnalyticsComponent),
      },
    ]
  },

  // Shop routes — lazy loaded, user authenticated
  {
    path: 'shop',
    loadComponent: () =>
      import('./features/shop/shop-shell.component').then(m => m.ShopShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'catalogue', pathMatch: 'full' },
      {
        path: 'catalogue',
        loadComponent: () =>
          import('./features/shop/catalogue/catalogue.component').then(m => m.CatalogueComponent),
      },
      {
        path: 'products/:id',
        loadComponent: () =>
          import('./features/shop/product-detail/product-detail.component').then(m => m.ProductDetailComponent),
        resolve: { product: productResolver },
      },
      {
        path: 'checkout/step/:n',
        loadComponent: () =>
          import('./features/shop/checkout/checkout.component').then(m => m.CheckoutComponent),
        canActivate: [checkoutStepGuard],
      },
      {
        path: 'order-confirmation/:id',
        loadComponent: () =>
          import('./features/shop/order-confirmation/order-confirmation.component').then(m => m.OrderConfirmationComponent),
      },
    ]
  },

  { path: '**', redirectTo: '/login' }
];
