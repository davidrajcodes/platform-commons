import { Pipe, PipeTransform } from '@angular/core';

// Pure pipe — only re-runs when input reference changes
@Pipe({ name: 'appCurrency', standalone: true, pure: true })
export class AppCurrencyPipe implements PipeTransform {
  transform(value: number, currency = 'USD', locale = 'en-US'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  }
}
