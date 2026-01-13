// CPF Validation with check digit verification
export function validateCPF(cpf: string): boolean {
  // Remove non-numeric characters
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Must have 11 digits
  if (cleanCPF.length !== 11) return false;
  
  // Check for known invalid patterns (all same digits)
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Calculate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false;
  
  // Calculate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(10))) return false;
  
  return true;
}

// CNPJ Validation with check digit verification
export function validateCNPJ(cnpj: string): boolean {
  // Remove non-numeric characters
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  // Must have 14 digits
  if (cleanCNPJ.length !== 14) return false;
  
  // Check for known invalid patterns (all same digits)
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;
  
  // Calculate first check digit
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(cleanCNPJ.charAt(12))) return false;
  
  // Calculate second check digit
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (digit2 !== parseInt(cleanCNPJ.charAt(13))) return false;
  
  return true;
}

// Validate PIX key based on detected type
export function validatePixKey(value: string): { valid: boolean; error?: string } {
  if (!value || value.trim() === '') {
    return { valid: true }; // Empty is valid (optional field)
  }
  
  const numericOnly = value.replace(/\D/g, '');
  
  // Check if it's an email
  if (value.includes('@')) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return { valid: false, error: 'E-mail inválido' };
    }
    return { valid: true };
  }
  
  // Check if it's a random key (UUID format)
  if (/^[a-f0-9]{8}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{12}$/i.test(value.replace(/\s/g, ''))) {
    return { valid: true };
  }
  
  // Check numeric patterns
  if (numericOnly.length === 11) {
    // Could be CPF or phone
    const ddd = parseInt(numericOnly.substring(0, 2));
    if (ddd >= 11 && ddd <= 99 && numericOnly[2] === '9') {
      // Looks like a phone number - valid format
      return { valid: true };
    }
    
    // Validate as CPF
    if (!validateCPF(numericOnly)) {
      return { valid: false, error: 'CPF inválido - verifique os dígitos' };
    }
    return { valid: true };
  }
  
  if (numericOnly.length === 14) {
    // Validate as CNPJ
    if (!validateCNPJ(numericOnly)) {
      return { valid: false, error: 'CNPJ inválido - verifique os dígitos' };
    }
    return { valid: true };
  }
  
  // For other formats, accept as-is (could be phone with country code, etc.)
  if (numericOnly.length > 0 && numericOnly.length < 11) {
    return { valid: false, error: 'CPF/CNPJ incompleto' };
  }
  
  return { valid: true };
}
