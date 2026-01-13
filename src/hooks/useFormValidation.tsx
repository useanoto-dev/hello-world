import { useState, useCallback, useMemo } from 'react';

export interface ValidationRule {
  validate: (value: any) => boolean;
  message: string;
}

export interface FieldValidation {
  required?: boolean | string;
  minLength?: { value: number; message?: string };
  maxLength?: { value: number; message?: string };
  min?: { value: number; message?: string };
  max?: { value: number; message?: string };
  pattern?: { value: RegExp; message: string };
  custom?: ValidationRule[];
}

export interface FieldState {
  value: any;
  error: string | null;
  touched: boolean;
  isValid: boolean;
}

export const validationPatterns = {
  phone: /^[\d\s\-()]+$/,
  whatsapp: /^55\d{10,11}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  instagram: /^@?[\w.]+$/,
  url: /^https?:\/\/.+/,
  hexColor: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  pixKey: /^.{1,100}$/,
  slug: /^[a-z0-9]+(-[a-z0-9]+)*$/,
};

export function validateField(value: any, rules?: FieldValidation): string | null {
  if (!rules) return null;

  const stringValue = value?.toString() || '';
  const isEmpty = stringValue.trim() === '' || value === null || value === undefined;

  // Required check
  if (rules.required && isEmpty) {
    return typeof rules.required === 'string' ? rules.required : 'Este campo é obrigatório';
  }

  // If empty and not required, skip other validations
  if (isEmpty) return null;

  // Min length
  if (rules.minLength && stringValue.length < rules.minLength.value) {
    return rules.minLength.message || `Mínimo de ${rules.minLength.value} caracteres`;
  }

  // Max length
  if (rules.maxLength && stringValue.length > rules.maxLength.value) {
    return rules.maxLength.message || `Máximo de ${rules.maxLength.value} caracteres`;
  }

  // Min value (for numbers)
  if (rules.min !== undefined && typeof value === 'number' && value < rules.min.value) {
    return rules.min.message || `Valor mínimo: ${rules.min.value}`;
  }

  // Max value (for numbers)
  if (rules.max !== undefined && typeof value === 'number' && value > rules.max.value) {
    return rules.max.message || `Valor máximo: ${rules.max.value}`;
  }

  // Pattern
  if (rules.pattern && !rules.pattern.value.test(stringValue)) {
    return rules.pattern.message;
  }

  // Custom rules
  if (rules.custom) {
    for (const rule of rules.custom) {
      if (!rule.validate(value)) {
        return rule.message;
      }
    }
  }

  return null;
}

export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationSchema: Partial<Record<keyof T, FieldValidation>>
) {
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const validateAllFields = useCallback(
    (values: T): Partial<Record<keyof T, string | null>> => {
      const errors: Partial<Record<keyof T, string | null>> = {};
      for (const field of Object.keys(validationSchema) as (keyof T)[]) {
        errors[field] = validateField(values[field], validationSchema[field]);
      }
      return errors;
    },
    [validationSchema]
  );

  const getFieldError = useCallback(
    (field: keyof T, value: any): string | null => {
      return validateField(value, validationSchema[field]);
    },
    [validationSchema]
  );

  const markTouched = useCallback((field: keyof T) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const resetTouched = useCallback(() => {
    setTouched({});
  }, []);

  const isFieldTouched = useCallback(
    (field: keyof T): boolean => {
      return touched[field] || false;
    },
    [touched]
  );

  return {
    validateAllFields,
    getFieldError,
    markTouched,
    resetTouched,
    isFieldTouched,
    touched,
  };
}

// Settings page specific validation schema
export const settingsValidationSchema = {
  name: {
    required: 'Nome do restaurante é obrigatório',
    minLength: { value: 2, message: 'Nome deve ter pelo menos 2 caracteres' },
    maxLength: { value: 100, message: 'Nome deve ter no máximo 100 caracteres' },
  },
  phone: {
    minLength: { value: 10, message: 'Telefone deve ter pelo menos 10 dígitos' },
    maxLength: { value: 11, message: 'Telefone deve ter no máximo 11 dígitos' },
  },
  whatsapp: {
    minLength: { value: 12, message: 'WhatsApp deve ter 12 ou 13 dígitos (55 + DDD + número)' },
    maxLength: { value: 13, message: 'WhatsApp deve ter 12 ou 13 dígitos (55 + DDD + número)' },
  },
  instagram: {
    pattern: { value: validationPatterns.instagram, message: 'Instagram deve começar com @ e conter apenas letras, números e pontos' },
  },
  pix_key: {
    maxLength: { value: 100, message: 'Chave PIX muito longa' },
  },
  google_maps_link: {
    pattern: { value: validationPatterns.url, message: 'Link deve começar com http:// ou https://' },
  },
  estimated_prep_time: {
    required: 'Tempo de preparo é obrigatório',
    min: { value: 1, message: 'Tempo mínimo: 1 minuto' },
    max: { value: 180, message: 'Tempo máximo: 180 minutos' },
  },
  estimated_delivery_time: {
    required: 'Tempo de entrega é obrigatório',
    min: { value: 1, message: 'Tempo mínimo: 1 minuto' },
    max: { value: 180, message: 'Tempo máximo: 180 minutos' },
  },
  delivery_fee: {
    min: { value: 0, message: 'Taxa não pode ser negativa' },
    max: { value: 1000, message: 'Taxa máxima: R$ 1000' },
  },
  min_order_value: {
    min: { value: 0, message: 'Valor não pode ser negativo' },
    max: { value: 10000, message: 'Valor máximo: R$ 10.000' },
  },
  primary_color: {
    required: 'Cor primária é obrigatória',
    pattern: { value: validationPatterns.hexColor, message: 'Cor deve estar no formato #RRGGBB' },
  },
  secondary_color: {
    required: 'Cor secundária é obrigatória',
    pattern: { value: validationPatterns.hexColor, message: 'Cor deve estar no formato #RRGGBB' },
  },
  address: {
    maxLength: { value: 500, message: 'Endereço muito longo (máx. 500 caracteres)' },
  },
  about_us: {
    maxLength: { value: 2000, message: 'Texto muito longo (máx. 2000 caracteres)' },
  },
};
