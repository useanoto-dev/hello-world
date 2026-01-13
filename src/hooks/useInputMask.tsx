import { useState, useCallback, ChangeEvent } from 'react';

export type MaskType = 'phone' | 'whatsapp' | 'cpf' | 'cnpj' | 'cep' | 'currency' | 'pix_cpf_cnpj';

// Mask patterns
const masks = {
  phone: {
    pattern: '(99) 9999-9999',
    pattern2: '(99) 99999-9999', // For 9-digit phones
    placeholder: '(11) 1234-5678',
  },
  whatsapp: {
    pattern: '55 (99) 99999-9999',
    placeholder: '55 (11) 99999-9999',
  },
  cpf: {
    pattern: '999.999.999-99',
    placeholder: '000.000.000-00',
  },
  cnpj: {
    pattern: '99.999.999/9999-99',
    placeholder: '00.000.000/0000-00',
  },
  cep: {
    pattern: '99999-999',
    placeholder: '00000-000',
  },
  pix_cpf_cnpj: {
    placeholder: 'CPF ou CNPJ',
  },
};

// Apply mask to value
export function applyMask(value: string, maskType: MaskType): string {
  // Remove all non-numeric characters
  const numericValue = value.replace(/\D/g, '');
  
  switch (maskType) {
    case 'phone': {
      if (numericValue.length <= 10) {
        // (XX) XXXX-XXXX
        return numericValue
          .replace(/^(\d{0,2})/, '($1')
          .replace(/(\d{2})(\d{0,4})/, '$1) $2')
          .replace(/(\d{4})(\d{0,4})/, '$1-$2')
          .replace(/(-\d{4})\d+?$/, '$1')
          .replace(/\((\)|$)/, '')
          .replace(/\) $/, '');
      } else {
        // (XX) XXXXX-XXXX (9-digit phone)
        return numericValue
          .replace(/^(\d{0,2})/, '($1')
          .replace(/(\d{2})(\d{0,5})/, '$1) $2')
          .replace(/(\d{5})(\d{0,4})/, '$1-$2')
          .replace(/(-\d{4})\d+?$/, '$1')
          .replace(/\((\)|$)/, '')
          .replace(/\) $/, '');
      }
    }
    
    case 'whatsapp': {
      // 55 (XX) XXXXX-XXXX format
      if (numericValue.length === 0) return '';
      
      let formatted = numericValue;
      
      // Ensure starts with 55
      if (!formatted.startsWith('55')) {
        formatted = '55' + formatted;
      }
      
      // Remove the 55 prefix for formatting the rest
      const withoutCountry = formatted.slice(2);
      
      if (withoutCountry.length === 0) {
        return '55';
      }
      
      // Format the rest as (XX) XXXXX-XXXX
      const ddd = withoutCountry.slice(0, 2);
      const part1 = withoutCountry.slice(2, 7);
      const part2 = withoutCountry.slice(7, 11);
      
      let result = '55';
      if (ddd) {
        result += ` (${ddd}`;
        if (ddd.length === 2) {
          result += ')';
          if (part1) {
            result += ` ${part1}`;
            if (part1.length === 5 && part2) {
              result += `-${part2}`;
            }
          }
        }
      }
      
      return result;
    }
    
    case 'cpf': {
      return numericValue
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    }
    
    case 'cnpj': {
      return numericValue
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    }
    
    case 'cep': {
      return numericValue
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{3})\d+?$/, '$1');
    }
    
    case 'pix_cpf_cnpj': {
      // Auto-detect CPF (11 digits) or CNPJ (14 digits)
      if (numericValue.length <= 11) {
        // CPF format: 000.000.000-00
        return numericValue
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d{1,2})/, '$1-$2')
          .replace(/(-\d{2})\d+?$/, '$1');
      } else {
        // CNPJ format: 00.000.000/0000-00
        return numericValue
          .replace(/^(\d{2})(\d)/, '$1.$2')
          .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
          .replace(/\.(\d{3})(\d)/, '.$1/$2')
          .replace(/(\d{4})(\d)/, '$1-$2')
          .replace(/(-\d{2})\d+?$/, '$1');
      }
    }
    
    default:
      return value;
  }
}

// Remove mask and return only numbers
export function removeMask(value: string): string {
  return value.replace(/\D/g, '');
}

// Hook for using masked inputs
export function useInputMask(maskType: MaskType, initialValue: string = '') {
  const [displayValue, setDisplayValue] = useState(() => applyMask(initialValue, maskType));
  const [rawValue, setRawValue] = useState(() => removeMask(initialValue));

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement> | string) => {
    const inputValue = typeof e === 'string' ? e : e.target.value;
    const masked = applyMask(inputValue, maskType);
    const raw = removeMask(inputValue);
    
    setDisplayValue(masked);
    setRawValue(raw);
    
    return { masked, raw };
  }, [maskType]);

  const setValue = useCallback((value: string) => {
    const masked = applyMask(value, maskType);
    const raw = removeMask(value);
    setDisplayValue(masked);
    setRawValue(raw);
  }, [maskType]);

  return {
    displayValue,
    rawValue,
    handleChange,
    setValue,
    placeholder: masks[maskType]?.placeholder || '',
  };
}

// Get the raw value for storage (WhatsApp needs the full number without formatting)
export function getStorageValue(value: string, maskType: MaskType): string {
  const raw = removeMask(value);
  
  if (maskType === 'whatsapp') {
    // Ensure it starts with 55 for Brazil
    return raw.startsWith('55') ? raw : '55' + raw;
  }
  
  return raw;
}
