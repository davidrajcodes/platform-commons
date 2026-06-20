import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { ProductService } from '../services/product.service';
import { Product } from '../models/product.model';

export const productResolver: ResolveFn<Product> = (route) => {
  const productService = inject(ProductService);
  const id = Number(route.paramMap.get('id'));
  return productService.getProduct(id);
};
