import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { validateStrongPassword, PASSWORD_REQUIREMENTS } from "@/lib/validators";

interface PasswordStrengthIndicatorProps {
  password: string;
  showOnlyErrors?: boolean;
  className?: string;
}

export function PasswordStrengthIndicator({ 
  password, 
  showOnlyErrors = false,
  className 
}: PasswordStrengthIndicatorProps) {
  const validation = validateStrongPassword(password);
  
  const requirements = [
    { key: 'minLength', label: `Mínimo ${PASSWORD_REQUIREMENTS.minLength} caracteres`, met: validation.requirements.minLength },
    { key: 'hasUppercase', label: 'Letra maiúscula (A-Z)', met: validation.requirements.hasUppercase },
    { key: 'hasLowercase', label: 'Letra minúscula (a-z)', met: validation.requirements.hasLowercase },
    { key: 'hasNumber', label: 'Número (0-9)', met: validation.requirements.hasNumber },
    { key: 'hasSymbol', label: 'Símbolo (!@#$%...)', met: validation.requirements.hasSymbol },
  ];

  const displayRequirements = showOnlyErrors 
    ? requirements.filter(r => !r.met) 
    : requirements;

  if (showOnlyErrors && displayRequirements.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-1.5 text-xs", className)}>
      {displayRequirements.map((req) => (
        <div 
          key={req.key} 
          className={cn(
            "flex items-center gap-2 transition-colors",
            req.met ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
          )}
        >
          {req.met ? (
            <Check className="w-3.5 h-3.5 flex-shrink-0" />
          ) : (
            <X className="w-3.5 h-3.5 flex-shrink-0 text-destructive" />
          )}
          <span>{req.label}</span>
        </div>
      ))}
    </div>
  );
}
