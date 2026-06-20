import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function luhnValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value ?? '').replace(/\s/g, '');
    if (!value) return null; // Let required validator handle empty
    if (!/^\d+$/.test(value)) return { luhn: 'Card number must contain only digits' };
    if (value.length < 13 || value.length > 19) return { luhn: 'Card number must be 13–19 digits' };
    if (!luhnCheck(value)) return { luhn: 'Invalid card number' };
    return null;
  };
}

function luhnCheck(num: string): boolean {
  let sum = 0;
  let isEven = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let digit = parseInt(num[i], 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}
