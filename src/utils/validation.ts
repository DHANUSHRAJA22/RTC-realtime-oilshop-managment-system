import { VALIDATION_PATTERNS } from '../types';

export const validatePhone = (phone: string): boolean => {
  return VALIDATION_PATTERNS.phone.test(phone);
};

export const validateEmail = (email: string): boolean => {
  return VALIDATION_PATTERNS.email.test(email);
};

export const validateQuantity = (quantity: string): boolean => {
  return VALIDATION_PATTERNS.quantity.test(quantity) && parseFloat(quantity) > 0;
};

export const validateAmount = (amount: string): boolean => {
  return VALIDATION_PATTERNS.amount.test(amount) && parseFloat(amount) > 0;
};

export const validateName = (name: string): boolean => {
  return VALIDATION_PATTERNS.name.test(name.trim());
};

export const validateRequired = (value: string): boolean => {
  return value.trim().length > 0;
};

export const validateMinLength = (value: string, minLength: number): boolean => {
  return value.trim().length >= minLength;
};

export const validateMaxLength = (value: string, maxLength: number): boolean => {
  return value.trim().length <= maxLength;
};

export const validateNumericRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

export const getValidationErrors = (data: any): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (data.name && !validateName(data.name)) {
    errors.name = 'Name must be 2-50 characters and contain only letters and spaces';
  }

  if (data.phone && !validatePhone(data.phone)) {
    errors.phone = 'Please enter a valid 10-digit phone number starting with 6-9';
  }

  if (data.email && !validateEmail(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (data.quantity && !validateQuantity(data.quantity.toString())) {
    errors.quantity = 'Please enter a valid quantity greater than 0';
  }

  if (data.amount && !validateAmount(data.amount.toString())) {
    errors.amount = 'Please enter a valid amount greater than 0';
  }

  return errors;
};