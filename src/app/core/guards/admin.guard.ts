import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    const returnUrl = route.url.map(s => s.path).join('/');
    return router.createUrlTree(['/login'], { queryParams: { returnUrl } });
  }

  if (auth.role() !== 'admin') {
    return router.createUrlTree(['/shop']);
  }

  return true;
};
