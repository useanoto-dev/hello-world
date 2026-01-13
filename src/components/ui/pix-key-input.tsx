import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle, Info, QrCode } from "lucide-react";
import { applyMask } from "@/hooks/useInputMask";
import { validatePixKey } from "@/lib/validators";

interface PixKeyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  description?: string;
  error?: string | null;
  touched?: boolean;
  showSuccessState?: boolean;
  value: string;
  onValueChange?: (value: string) => void;
  onBlur?: () => void;
}

// Detect the type of PIX key
function detectPixKeyType(value: string): 'cpf' | 'cnpj' | 'phone' | 'email' | 'random' | 'unknown' {
  const numericOnly = value.replace(/\D/g, '');
  
  // Check if it's email format
  if (value.includes('@')) {
    return 'email';
  }
  
  // Check numeric patterns
  if (numericOnly.length === 11) {
    // Could be CPF or phone - check for phone pattern (starts with DDD)
    const ddd = parseInt(numericOnly.substring(0, 2));
    if (ddd >= 11 && ddd <= 99 && numericOnly[2] === '9') {
      return 'phone';
    }
    return 'cpf';
  }
  
  if (numericOnly.length === 14) {
    return 'cnpj';
  }
  
  // Check for random key format (32 chars alphanumeric)
  if (/^[a-f0-9]{8}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{12}$/i.test(value.replace(/\s/g, ''))) {
    return 'random';
  }
  
  return 'unknown';
}

// Get label for detected type
function getTypeLabel(type: ReturnType<typeof detectPixKeyType>): string {
  const labels: Record<typeof type, string> = {
    cpf: 'CPF',
    cnpj: 'CNPJ',
    phone: 'Telefone',
    email: 'E-mail',
    random: 'Chave Aleatória',
    unknown: '',
  };
  return labels[type];
}

export function PixKeyInput({
  label,
  description,
  error: externalError,
  touched = false,
  showSuccessState = true,
  value,
  onValueChange,
  onBlur,
  className,
  ...props
}: PixKeyInputProps) {
  // Internal validation state
  const validation = React.useMemo(() => validatePixKey(value || ''), [value]);
  
  // Use external error if provided, otherwise use internal validation
  const error = externalError || (touched ? validation.error : undefined);
  const hasError = touched && error;
  
  // Detect the type of PIX key being entered
  const detectedType = React.useMemo(() => detectPixKeyType(value || ''), [value]);
  
  // Apply mask only for CPF/CNPJ types
  const displayValue = React.useMemo(() => {
    if (!value) return '';
    
    const numericOnly = value.replace(/\D/g, '');
    
    // Only apply mask if it looks like CPF or CNPJ (pure numeric input)
    if (detectedType === 'cpf' || detectedType === 'cnpj' || (numericOnly.length > 0 && numericOnly === value.replace(/[\.\-\/\s]/g, ''))) {
      return applyMask(value, 'pix_cpf_cnpj');
    }
    
    return value;
  }, [value, detectedType]);
  
  const isValid = touched && !error && validation.valid && (value?.trim() || '') !== '';
  const showSuccess = showSuccessState && isValid;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const numericOnly = inputValue.replace(/\D/g, '');
    
    // If input is purely numeric or has CPF/CNPJ formatting, store numeric only
    if (numericOnly === inputValue.replace(/[\.\-\/\s]/g, '') && numericOnly.length > 0) {
      onValueChange?.(numericOnly);
    } else {
      // For email, random keys, etc., store as-is
      onValueChange?.(inputValue);
    }
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <Label className={cn(hasError && "text-destructive")}>
          {label}
          {props.required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <QrCode className="w-4 h-4" />
        </div>
        <Input
          value={displayValue}
          onChange={handleChange}
          onBlur={onBlur}
          className={cn(
            "pl-9",
            hasError && "border-destructive focus-visible:ring-destructive/30",
            showSuccess && "border-success focus-visible:ring-success/30",
            "pr-9",
            className
          )}
          {...props}
        />
        {(hasError || showSuccess) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {hasError ? (
              <AlertCircle className="w-4 h-4 text-destructive" />
            ) : showSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-success" />
            ) : null}
          </div>
        )}
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          {hasError ? (
            <p className="text-xs text-destructive flex items-center gap-1">
              <span>{error}</span>
            </p>
          ) : detectedType !== 'unknown' && value ? (
            <p className="text-xs text-success flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
              <span>Tipo detectado: {getTypeLabel(detectedType)}</span>
            </p>
          ) : description ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3 flex-shrink-0" />
              <span>{description}</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
