import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, Validators, AbstractControl, ValidatorFn } from '@angular/forms';

export interface FormFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'number';
  validators: string[];
  placeholder?: string;
  options?: string[];
  visibleWhen?: { field: string; value: string };
}

function buildValidators(validatorDefs: string[]): ValidatorFn[] {
  return validatorDefs.map(def => {
    const [name, arg] = def.split(':');
    switch (name) {
      case 'required': return Validators.required;
      case 'email': return Validators.email;
      case 'minLength': return Validators.minLength(Number(arg));
      case 'maxLength': return Validators.maxLength(Number(arg));
      case 'pattern': return Validators.pattern(arg);
      default: return Validators.nullValidator;
    }
  });
}

/**
 * Pure presenter — no knowledge of which step or module is using it.
 * Accepts JSON config and FormGroup as inputs only.
 */
@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div [formGroup]="formGroup" class="dyn-form">
      @for (field of visibleFields; track field.name) {
        <div class="form-field" [class.form-field--error]="isInvalid(field.name)">
          <label [for]="field.name" class="form-field__label">
            {{ field.label }}
            @if (isRequired(field)) { <span class="req">*</span> }
          </label>

          @switch (field.type) {
            @case ('textarea') {
              <textarea
                [id]="field.name"
                [formControlName]="field.name"
                [placeholder]="field.placeholder ?? ''"
                rows="3"
                class="form-field__control"
              ></textarea>
            }
            @case ('select') {
              <select [id]="field.name" [formControlName]="field.name" class="form-field__control">
                <option value="">{{ field.placeholder ?? 'Select…' }}</option>
                @for (opt of field.options; track opt) {
                  <option [value]="opt">{{ opt }}</option>
                }
              </select>
            }
            @default {
              <input
                [id]="field.name"
                [type]="field.type"
                [formControlName]="field.name"
                [placeholder]="field.placeholder ?? ''"
                class="form-field__control"
              />
            }
          }

          @if (isInvalid(field.name)) {
            <span class="form-field__error">{{ getError(field.name) }}</span>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .dyn-form { display: flex; flex-direction: column; gap: 1.25rem; }
    .form-field { display: flex; flex-direction: column; gap: 0.35rem; }
    .form-field__label { font-size: 0.875rem; font-weight: 600; color: #374151; }
    .req { color: #ef4444; margin-left: 2px; }
    .form-field__control {
      padding: 0.625rem 0.875rem;
      border: 1.5px solid #d1d5db;
      border-radius: 8px;
      font-size: 0.95rem;
      transition: border-color 0.2s;
      outline: none;
      background: white;
    }
    .form-field__control:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
    .form-field--error .form-field__control { border-color: #ef4444; }
    .form-field__error { font-size: 0.8rem; color: #ef4444; }
    textarea.form-field__control { resize: vertical; min-height: 80px; }
  `]
})
export class DynamicFormComponent implements OnInit {
  @Input({ required: true }) fields: FormFieldConfig[] = [];
  @Input({ required: true }) formGroup!: FormGroup;

  visibleFields: FormFieldConfig[] = [];

  ngOnInit(): void {
    this.updateVisibleFields();
    // Apply validators from config
    this.fields.forEach(f => {
      const ctrl = this.formGroup.get(f.name);
      if (ctrl) ctrl.setValidators(buildValidators(f.validators));
      ctrl?.updateValueAndValidity();
    });
    this.formGroup.valueChanges.subscribe(() => this.updateVisibleFields());
  }

  private updateVisibleFields(): void {
    this.visibleFields = this.fields.filter(f => {
      if (!f.visibleWhen) return true;
      const dep = this.formGroup.get(f.visibleWhen.field);
      return dep?.value === f.visibleWhen.value;
    });
  }

  isInvalid(name: string): boolean {
    const ctrl = this.formGroup.get(name);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  isRequired(field: FormFieldConfig): boolean {
    return field.validators.includes('required');
  }

  getError(name: string): string {
    const ctrl = this.formGroup.get(name);
    if (!ctrl?.errors) return '';
    if (ctrl.errors['required']) return 'This field is required.';
    if (ctrl.errors['email']) return 'Enter a valid email address.';
    if (ctrl.errors['minlength']) return `Minimum ${ctrl.errors['minlength'].requiredLength} characters.`;
    if (ctrl.errors['pattern']) return 'Invalid format.';
    return 'Invalid value.';
  }
}
