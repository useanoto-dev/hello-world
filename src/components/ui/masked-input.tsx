import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import { applyMask, removeMask, MaskType } from "@/hooks/useInputMask";

interface MaskedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  description?: string;
  error?: string | null;
  touched?: boolean;
  showSuccessState?: boolean;
  value: string;
  onValueChange?: (rawValue: string, maskedValue: string) => void;
  onBlur?: () => void;
  maskType: MaskType;
  leftIcon?: React.ReactNode;
}

export function MaskedInput({
  label,
  description,
  error,
  touched = false,
  showSuccessState = true,
  value,
  onValueChange,
  onBlur,
  maskType,
  leftIcon,
  className,
  ...props
}: MaskedInputProps) {
  const hasError = touched && error;
  
  // Apply mask to display value
  const displayValue = React.useMemo(() => {
    return applyMask(value, maskType);
  }, [value, maskType]);
  
  const isValid = touched && !error && displayValue.trim() !== '';
  const showSuccess = showSuccessState && isValid;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const masked = applyMask(inputValue, maskType);
    const raw = removeMask(inputValue);
    
    // For WhatsApp, ensure we store with 55 prefix
    let storageValue = raw;
    if (maskType === 'whatsapp' && raw && !raw.startsWith('55')) {
      storageValue = '55' + raw;
    }
    
    onValueChange?.(storageValue, masked);
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
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {leftIcon}
          </div>
        )}
        <Input
          value={displayValue}
          onChange={handleChange}
          onBlur={onBlur}
          className={cn(
            leftIcon && "pl-9",
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
