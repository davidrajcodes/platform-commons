import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CheckoutStateService } from '../services/checkout-state.service';
import { CartService } from '../services/cart.service';

export const checkoutStepGuard: CanActivateFn = (route) => {
  const checkoutState = inject(CheckoutStateService);
  const cartService = inject(CartService);
  const router = inject(Router);

  const step = Number(route.paramMap.get('n') ?? 1);

  if (step === 1) {
    if (cartService.items().length === 0) {
      return router.createUrlTree(['/shop']);
    }
    return true;
  }

  if (!checkoutState.isStepAccessible(step)) {
    return router.createUrlTree(['/shop/checkout/step/1']);
  }

  return true;
};
