import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

interface ValidatedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  description?: string;
  error?: string | null;
  touched?: boolean;
  showSuccessState?: boolean;
  onValueChange?: (value: string) => void;
  onBlur?: () => void;
  leftIcon?: React.ReactNode;
  characterCount?: { current: number; max: number };
}

interface ValidatedTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label?: string;
  description?: string;
  error?: string | null;
  touched?: boolean;
  showSuccessState?: boolean;
  onValueChange?: (value: string) => void;
  onBlur?: () => void;
  characterCount?: { current: number; max: number };
}

export function ValidatedInput({
  label,
  description,
  error,
  touched = false,
  showSuccessState = true,
  onValueChange,
  onBlur,
  leftIcon,
  characterCount,
  className,
  value,
  ...props
}: ValidatedInputProps) {
  const hasError = touched && error;
  const isValid = touched && !error && value && String(value).trim() !== '';
  const showSuccess = showSuccessState && isValid;

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
          value={value}
          onChange={(e) => onValueChange?.(e.target.value)}
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
        {characterCount && (
          <p className={cn(
            "text-xs flex-shrink-0",
            characterCount.current > characterCount.max ? "text-destructive" : "text-muted-foreground"
          )}>
            {characterCount.current}/{characterCount.max}
          </p>
        )}
      </div>
    </div>
  );
}

export function ValidatedTextarea({
  label,
  description,
  error,
  touched = false,
  showSuccessState = true,
  onValueChange,
  onBlur,
  characterCount,
  className,
  value,
  ...props
}: ValidatedTextareaProps) {
  const hasError = touched && error;
  const isValid = touched && !error && value && String(value).trim() !== '';
  const showSuccess = showSuccessState && isValid;

  return (
    <div className="space-y-1.5">
      {label && (
        <Label className={cn(hasError && "text-destructive")}>
          {label}
          {props.required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onValueChange?.(e.target.value)}
          onBlur={onBlur}
          className={cn(
            hasError && "border-destructive focus-visible:ring-destructive/30",
            showSuccess && "border-success focus-visible:ring-success/30",
            className
          )}
          {...props}
        />
        {(hasError || showSuccess) && (
          <div className="absolute right-3 top-3">
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
        {characterCount && (
          <p className={cn(
            "text-xs flex-shrink-0",
            characterCount.current > characterCount.max ? "text-destructive" : "text-muted-foreground"
          )}>
            {characterCount.current}/{characterCount.max}
          </p>
        )}
      </div>
    </div>
  );
}
