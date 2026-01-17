import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MapPin, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// Brazilian states
const STATES = [
  { uf: "AC", name: "Acre" },
  { uf: "AL", name: "Alagoas" },
  { uf: "AP", name: "Amapá" },
  { uf: "AM", name: "Amazonas" },
  { uf: "BA", name: "Bahia" },
  { uf: "CE", name: "Ceará" },
  { uf: "DF", name: "Distrito Federal" },
  { uf: "ES", name: "Espírito Santo" },
  { uf: "GO", name: "Goiás" },
  { uf: "MA", name: "Maranhão" },
  { uf: "MT", name: "Mato Grosso" },
  { uf: "MS", name: "Mato Grosso do Sul" },
  { uf: "MG", name: "Minas Gerais" },
  { uf: "PA", name: "Pará" },
  { uf: "PB", name: "Paraíba" },
  { uf: "PR", name: "Paraná" },
  { uf: "PE", name: "Pernambuco" },
  { uf: "PI", name: "Piauí" },
  { uf: "RJ", name: "Rio de Janeiro" },
  { uf: "RN", name: "Rio Grande do Norte" },
  { uf: "RS", name: "Rio Grande do Sul" },
  { uf: "RO", name: "Rondônia" },
  { uf: "RR", name: "Roraima" },
  { uf: "SC", name: "Santa Catarina" },
  { uf: "SP", name: "São Paulo" },
  { uf: "SE", name: "Sergipe" },
  { uf: "TO", name: "Tocantins" },
];

export interface AddressData {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  number: string;
  complement: string;
}

interface AddressInputProps {
  value: AddressData;
  onChange: (address: AddressData) => void;
  disabled?: boolean;
}

// Brazilian state codes for validation
const VALID_STATE_CODES = STATES.map(s => s.uf);

// CEP validation regex - exactly 8 digits
const CEP_REGEX = /^\d{8}$/;

// Maximum field lengths for sanitization
const MAX_LENGTHS = {
  street: 255,
  neighborhood: 100,
  city: 100,
  state: 2
} as const;

/**
 * Validates and sanitizes a string value from the API
 * - Ensures it's a string
 * - Trims whitespace
 * - Limits length
 */
const sanitizeApiString = (value: unknown, maxLength: number): string => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
};

/**
 * Validates the structure of the ViaCEP API response
 */
const isValidViaCepResponse = (data: unknown): data is { 
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
} => {
  if (!data || typeof data !== 'object') return false;
  const response = data as Record<string, unknown>;
  
  // If it has 'erro', it's a valid response (CEP not found)
  if (response.erro === true) return true;
  
  // Otherwise, validate that expected fields are strings or undefined
  const stringFields = ['logradouro', 'bairro', 'localidade', 'uf'];
  for (const field of stringFields) {
    if (field in response && typeof response[field] !== 'string') {
      return false;
    }
  }
  
  return true;
};

export default function AddressInput({ value, onChange, disabled = false }: AddressInputProps) {
  const [loading, setLoading] = useState(false);
  const [cepValid, setCepValid] = useState(false);

  // Format CEP as user types
  const formatCep = (cep: string) => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
  };

  // Fetch address from CEP API with proper validation
  const fetchAddressFromCep = useCallback(async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    
    // Validate CEP format before making request
    if (!CEP_REGEX.test(cleanCep)) {
      return;
    }

    setLoading(true);
    setCepValid(false);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${cleanCep}/json/`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const data: unknown = await response.json();

      // Validate response structure
      if (!isValidViaCepResponse(data)) {
        console.warn('Invalid ViaCEP response structure');
        toast.error("Resposta inválida do serviço de CEP");
        return;
      }

      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }

      // Sanitize and validate each field
      const street = sanitizeApiString(data.logradouro, MAX_LENGTHS.street);
      const neighborhood = sanitizeApiString(data.bairro, MAX_LENGTHS.neighborhood);
      const city = sanitizeApiString(data.localidade, MAX_LENGTHS.city);
      const state = sanitizeApiString(data.uf, MAX_LENGTHS.state).toUpperCase();
      
      // Validate state code against known Brazilian states
      const validState = VALID_STATE_CODES.includes(state) ? state : '';

      onChange({
        ...value,
        cep: formatCep(cleanCep),
        street,
        neighborhood,
        city,
        state: validState,
      });

      setCepValid(true);
      toast.success("Endereço preenchido automaticamente!");
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.error("CEP lookup timeout");
        toast.error("Tempo limite excedido ao buscar CEP");
      } else {
        console.error("Error fetching CEP:", error);
        toast.error("Erro ao buscar CEP");
      }
    } finally {
      setLoading(false);
    }
  }, [value, onChange]);

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    onChange({ ...value, cep: formatted });
    
    // Auto-fetch when CEP is complete
    const cleanCep = formatted.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      fetchAddressFromCep(cleanCep);
    } else {
      setCepValid(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* CEP Input with auto-complete */}
      <div className="space-y-2">
        <Label htmlFor="cep" className="text-sm font-medium text-gray-700">
          CEP
        </Label>
        <div className="relative">
          <Input
            id="cep"
            type="text"
            placeholder="00000-000"
            value={value.cep}
            onChange={handleCepChange}
            maxLength={9}
            disabled={disabled}
            className="h-12 pr-10 text-base"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                  <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                </motion.div>
              ) : cepValid ? (
                <motion.div
                  key="valid"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                  <Check className="w-5 h-5 text-green-500" />
                </motion.div>
              ) : (
                <motion.div
                  key="icon"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                  <MapPin className="w-5 h-5 text-gray-400" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Digite o CEP para preencher automaticamente
        </p>
      </div>

      {/* State and City - Side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="state" className="text-sm font-medium text-gray-700">
            Estado
          </Label>
          <Select
            value={value.state}
            onValueChange={(state) => onChange({ ...value, state })}
            disabled={disabled}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {STATES.map((state) => (
                <SelectItem key={state.uf} value={state.uf}>
                  {state.uf} - {state.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="city" className="text-sm font-medium text-gray-700">
            Cidade
          </Label>
          <Input
            id="city"
            type="text"
            placeholder="Cidade"
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            disabled={disabled}
            className="h-12 text-base"
          />
        </div>
      </div>

      {/* Street */}
      <div className="space-y-2">
        <Label htmlFor="street" className="text-sm font-medium text-gray-700">
          Rua / Avenida
        </Label>
        <Input
          id="street"
          type="text"
          placeholder="Nome da rua"
          value={value.street}
          onChange={(e) => onChange({ ...value, street: e.target.value })}
          disabled={disabled}
          className="h-12 text-base"
        />
      </div>

      {/* Neighborhood */}
      <div className="space-y-2">
        <Label htmlFor="neighborhood" className="text-sm font-medium text-gray-700">
          Bairro
        </Label>
        <Input
          id="neighborhood"
          type="text"
          placeholder="Bairro"
          value={value.neighborhood}
          onChange={(e) => onChange({ ...value, neighborhood: e.target.value })}
          disabled={disabled}
          className="h-12 text-base"
        />
      </div>

      {/* Number and Complement */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="number" className="text-sm font-medium text-gray-700">
            Número
          </Label>
          <Input
            id="number"
            type="text"
            placeholder="Nº"
            value={value.number}
            onChange={(e) => onChange({ ...value, number: e.target.value })}
            disabled={disabled}
            className="h-12 text-base"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="complement" className="text-sm font-medium text-gray-700">
            Complemento
          </Label>
          <Input
            id="complement"
            type="text"
            placeholder="Apto, Sala..."
            value={value.complement}
            onChange={(e) => onChange({ ...value, complement: e.target.value })}
            disabled={disabled}
            className="h-12 text-base"
          />
        </div>
      </div>
    </div>
  );
}
