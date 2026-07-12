import { Component, computed, signal } from '@angular/core';
import { ReactiveFormsModule, NG_VALUE_ACCESSOR, NG_VALIDATORS, ControlValueAccessor, AbstractControl, ValidationErrors } from '@angular/forms';
import { luhnValidator } from '../../../shared/pipes/luhn.validator';

@Component({
  selector: 'app-card-input',
  imports: [ReactiveFormsModule],
  templateUrl: './card-input.component.html',
  styleUrl: './card-input.component.scss',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: CardInputComponent, multi: true },
    { provide: NG_VALIDATORS, useExisting: CardInputComponent, multi: true },
  ],
})
export class CardInputComponent  implements ControlValueAccessor {
  displayValue = computed(() => {
    return this.rawValue().replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
  });
  private rawValue = signal('');
  hasError = signal(false);
  disabled = signal(false);

  private validator = luhnValidator();

  private onChange = (_: string) => { };
  onTouched = () => { };

  onInput(event: Event): void {
    const raw = (event.target as HTMLInputElement)
      .value
      .replace(/\D/g, '')
      .slice(0, 16);

    this.rawValue.set(raw);

    this.onChange(raw);
    // this.onTouched();
  }

  writeValue(value: string): void {
    this.rawValue.set(value ?? '');
  }

  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  validate(control: AbstractControl): ValidationErrors | null {
    const errors = this.validator(control);

    this.hasError.set(
      !!errors);

    return errors;
  }

  cardBrand = computed(() => {
    const num = this.rawValue().replace(/\D/g, '');
    if (num.startsWith('4')) return '💳';
    if (/^5[1-5]/.test(num)) return '💳';
    if (num.startsWith('3')) return '💳';
    return '💳';
  });
}
