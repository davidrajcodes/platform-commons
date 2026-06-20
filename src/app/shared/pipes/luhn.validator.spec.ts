import { FormControl } from '@angular/forms';
import { luhnValidator } from './luhn.validator';

describe('luhnValidator', () => {
  const validate = luhnValidator();

  function ctrl(value: string): FormControl {
    return new FormControl(value);
  }

  it('should return null for a valid Visa test number', () => {
    // Luhn-valid number: 4111111111111111
    expect(validate(ctrl('4111111111111111'))).toBeNull();
  });

  it('should return null for a valid Mastercard test number', () => {
    expect(validate(ctrl('5500005555555559'))).toBeNull();
  });

  it('should return null for empty value (let required handle it)', () => {
    expect(validate(ctrl(''))).toBeNull();
  });

  it('should return error for an invalid Luhn number', () => {
    const result = validate(ctrl('1234567890123456'));
    expect(result).toBeTruthy();
    expect(result!['luhn']).toContain('Invalid');
  });

  it('should return error when number is too short', () => {
    const result = validate(ctrl('411111'));
    expect(result!['luhn']).toContain('13–19');
  });

  it('should return error when number contains non-digits', () => {
    const result = validate(ctrl('4111-1111-1111-1111'));
    // dashes stripped, should be fine if Luhn-valid
    // Note: our validator strips spaces but not dashes
    expect(result).toBeTruthy();
  });

  it('should strip spaces before validating', () => {
    // "4111 1111 1111 1111" with spaces is same as 4111111111111111
    expect(validate(ctrl('4111 1111 1111 1111'))).toBeNull();
  });

  it('should return error for number that is too long', () => {
    const result = validate(ctrl('12345678901234567890'));
    expect(result!['luhn']).toContain('13–19');
  });
});
