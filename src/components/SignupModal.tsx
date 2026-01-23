import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { X, Check, Eye, EyeOff, MapPin, Loader2 } from "lucide-react";
import { MascotSpinner } from "@/components/MascotSpinner";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { applyMask, removeMask } from "@/hooks/useInputMask";
import { validateStrongPassword, PASSWORD_REQUIREMENTS } from "@/lib/validators";

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

// Validation helpers
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidName = (name: string) => name.trim().length >= 2;
const isValidPhone = (phone: string) => removeMask(phone).length >= 10;
const isValidPassword = (password: string) => {
  return validateStrongPassword(password).isValid;
};

const triggerConfetti = () => {
  try {
    if (navigator.vibrate) {
      navigator.vibrate([50, 30, 50, 30, 100]);
    }
  } catch (e) {}

  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#FFC107', '#FFD54F', '#FFEB3B', '#FF9800', '#4CAF50']
  });
  
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#FFC107', '#FFD54F', '#FFEB3B']
    });
  }, 150);
  
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#FFC107', '#FFD54F', '#FFEB3B']
    });
  }, 300);
};

type FieldValidation = {
  isValid: boolean;
  isTouched: boolean;
};

const ValidationIcon = ({ validation }: { validation: FieldValidation }) => {
  if (!validation.isTouched) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute right-4 top-1/2 -translate-y-1/2"
    >
      {validation.isValid ? (
        <Check className="w-5 h-5 text-green-500" />
      ) : (
        <X className="w-5 h-5 text-red-500" />
      )}
    </motion.div>
  );
};

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export default function SignupModal({ isOpen, onClose, onSwitchToLogin }: SignupModalProps) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Lock body scroll and set viewport height when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${window.scrollY}px`;
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    };
  }, [isOpen]);
  
  // Form state
  const [fullName, setFullName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [phone, setPhone] = useState("");
  const [cep, setCep] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepValid, setCepValid] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Touched state
  const [touched, setTouched] = useState({
    fullName: false,
    storeName: false,
    phone: false,
    cep: false,
    city: false,
    state: false,
    email: false,
    password: false,
    acceptTerms: false,
  });

  const isValidCep = (c: string) => c.replace(/\D/g, "").length === 8;
  const isValidCity = (c: string) => c.trim().length >= 2;
  const isValidState = (s: string) => s.length === 2;

  const validations = {
    fullName: { isValid: isValidName(fullName), isTouched: touched.fullName },
    storeName: { isValid: isValidName(storeName), isTouched: touched.storeName },
    phone: { isValid: isValidPhone(phone), isTouched: touched.phone },
    cep: { isValid: isValidCep(cep), isTouched: touched.cep },
    city: { isValid: isValidCity(city), isTouched: touched.city },
    state: { isValid: isValidState(state), isTouched: touched.state },
    email: { isValid: isValidEmail(email), isTouched: touched.email },
    password: { isValid: isValidPassword(password), isTouched: touched.password },
  };

  const handleBlur = (field: keyof typeof touched) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // Format CEP as user types
  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
  };

  // Valid Brazilian state codes for validation
  const VALID_STATE_CODES = STATES.map(s => s.uf);

  // Maximum field lengths for sanitization
  const MAX_CITY_LENGTH = 100;

  /**
   * Validates and sanitizes a string value from the API
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
    localidade?: string;
    uf?: string;
  } => {
    if (!data || typeof data !== 'object') return false;
    const response = data as Record<string, unknown>;
    
    if (response.erro === true) return true;
    
    const stringFields = ['localidade', 'uf'];
    for (const field of stringFields) {
      if (field in response && typeof response[field] !== 'string') {
        return false;
      }
    }
    
    return true;
  };

  // Fetch address from CEP API with proper validation
  const fetchAddressFromCep = useCallback(async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, "");
    
    // Validate CEP format before making request - exactly 8 digits
    if (!/^\d{8}$/.test(cleanCep)) return;

    setCepLoading(true);
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
      const sanitizedCity = sanitizeApiString(data.localidade, MAX_CITY_LENGTH);
      const sanitizedState = sanitizeApiString(data.uf, 2).toUpperCase();
      
      // Validate state code against known Brazilian states
      const validState = VALID_STATE_CODES.includes(sanitizedState) ? sanitizedState : '';

      setCity(sanitizedCity);
      setState(validState);
      setCepValid(true);
      toast.success("Cidade e estado preenchidos!");
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
      setCepLoading(false);
    }
  }, [VALID_STATE_CODES]);

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    setCep(formatted);
    
    const cleanCep = formatted.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      fetchAddressFromCep(cleanCep);
    } else {
      setCepValid(false);
    }
  };

  const getInputClass = (validation: FieldValidation, hasIcon?: boolean) => {
    const base = `w-full h-12 sm:h-14 px-4 text-sm sm:text-base bg-gray-50 border-2 rounded-xl transition-all duration-200 focus:outline-none focus:bg-white ${hasIcon ? 'pr-20 sm:pr-24' : 'pr-10 sm:pr-12'}`;
    if (!validation.isTouched) return `${base} border-gray-200 focus:border-amber-400`;
    if (validation.isValid) return `${base} border-green-500 focus:border-green-500 bg-green-50/30`;
    return `${base} border-red-400 focus:border-red-500 bg-red-50/30`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all as touched
    setTouched({
      fullName: true,
      storeName: true,
      phone: true,
      cep: true,
      city: true,
      state: true,
      email: true,
      password: true,
      acceptTerms: true,
    });

    if (!isValidName(fullName)) {
      toast.error("Nome deve ter pelo menos 2 caracteres");
      return;
    }

    if (!isValidName(storeName)) {
      toast.error("Nome do estabelecimento deve ter pelo menos 2 caracteres");
      return;
    }

    if (!isValidPhone(phone)) {
      toast.error("Celular inválido");
      return;
    }

    if (!state || !city) {
      toast.error("Preencha a cidade e estado do seu estabelecimento");
      return;
    }

    if (!isValidEmail(email)) {
      toast.error("Email inválido");
      return;
    }

    if (!isValidPassword(password)) {
      toast.error("Senha deve ter no mínimo 6 caracteres, uma letra maiúscula e um caractere especial");
      return;
    }

    if (!acceptTerms) {
      toast.error("Você precisa aceitar a Política de Privacidade");
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: fullName,
            store_name: storeName,
            phone: removeMask(phone),
            cep: cep.replace(/\D/g, ""),
            city: city,
            state: state,
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("Este email já está cadastrado");
        } else {
          toast.error(error.message);
        }
        return;
      }

      triggerConfetti();
      toast.success("Conta criada! Verifique seu email para confirmar.");
      onClose();
    } catch (error: any) {
      toast.error("Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  // Password requirements UI - use centralized validation
  const passwordValidation = validateStrongPassword(password);
  const passwordRequirements = [
    { label: `Mínimo ${PASSWORD_REQUIREMENTS.minLength} caracteres`, met: passwordValidation.requirements.minLength },
    { label: "Uma letra maiúscula (A-Z)", met: passwordValidation.requirements.hasUppercase },
    { label: "Uma letra minúscula (a-z)", met: passwordValidation.requirements.hasLowercase },
    { label: "Um número (0-9)", met: passwordValidation.requirements.hasNumber },
    { label: "Um símbolo (!@#$%...)", met: passwordValidation.requirements.hasSymbol },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 z-[100] bg-white flex flex-col lg:flex-row"
          style={{ height: '100dvh' }}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.32, delay: 0.08, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Left Side - Yellow Background with Logo (Desktop only) */}
          <div 
            className="hidden lg:flex lg:w-[45%] xl:w-[40%] flex-col items-center justify-center p-8 xl:p-12 relative"
            style={{
              background: "linear-gradient(135deg, #FFC107 0%, #FFD54F 50%, #FFEB3B 100%)"
            }}
          >
            {/* Static decorative shapes - no animations for performance */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-20 left-16 w-24 xl:w-32 h-24 xl:h-32 rounded-full bg-white/15" />
              <div className="absolute bottom-32 right-20 w-20 xl:w-24 h-20 xl:h-24 rounded-full bg-white/20" />
              <div className="absolute top-1/2 right-24 w-12 xl:w-16 h-12 xl:h-16 rounded-full bg-white/10" />
            </div>

            <div className="text-center z-10 max-w-md">
              {/* Logo */}
              <img 
                src="https://felipedublin.com/wp-content/uploads/2026/01/anoto-logo-full.webp" 
                alt="Anotô?" 
                className="h-12 xl:h-16 mx-auto mb-8"
              />
              
              <h1 className="text-2xl xl:text-4xl font-bold text-gray-900 leading-tight">
                Agora complete abaixo para criar seu cardápio digital
              </h1>
              
              <p className="text-base xl:text-lg text-gray-800/80 mt-4">
                Em menos de 2 minutos você estará pronto para receber pedidos
              </p>
            </div>
          </div>

          {/* Right Side - White Form */}
          <div 
            className="flex-1 flex flex-col bg-white overflow-y-auto overscroll-contain"
            style={{ minHeight: '100dvh', maxHeight: '100dvh' }}
          >
            {/* Close button */}
            <div className="flex justify-end p-3 sm:p-4 pt-4 sm:pt-5 lg:p-6">
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
              </button>
            </div>

            {/* Form Container */}
            <div className="flex-1 flex flex-col px-5 sm:px-6 md:px-8 pt-2 pb-20 lg:pb-8 lg:px-12 xl:px-20 lg:justify-center">
              {/* Mobile/Tablet Header with Logo */}
              <div className="lg:hidden mb-6 sm:mb-8">
                <img 
                  src="https://felipedublin.com/wp-content/uploads/2026/01/anoto-logo-full.webp" 
                  alt="Anotô?" 
                  className="h-8 sm:h-10 mb-4 sm:mb-6"
                />
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
                  Complete abaixo para criar seu cardápio digital
                </h1>
              </div>

              <form 
                onSubmit={handleSubmit} 
                className="space-y-2.5 sm:space-y-3 max-w-md w-full mx-auto lg:mx-0"
              >
                {/* Nome Completo */}
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Nome Completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onBlur={() => handleBlur("fullName")}
                    className={getInputClass(validations.fullName)}
                    disabled={loading}
                  />
                  <ValidationIcon validation={validations.fullName} />
                </div>

                {/* Nome do Estabelecimento */}
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Nome do Estabelecimento"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    onBlur={() => handleBlur("storeName")}
                    className={getInputClass(validations.storeName)}
                    disabled={loading}
                  />
                  <ValidationIcon validation={validations.storeName} />
                </div>

                {/* Celular */}
                <div className="relative">
                  <Input
                    type="tel"
                    placeholder="Celular"
                    value={phone}
                    onChange={(e) => setPhone(applyMask(e.target.value, 'phone'))}
                    onBlur={() => handleBlur("phone")}
                    className={getInputClass(validations.phone)}
                    disabled={loading}
                    maxLength={15}
                  />
                  <ValidationIcon validation={validations.phone} />
                </div>

                {/* CEP com busca automática */}
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500 font-medium">Endereço do Estabelecimento</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="CEP (ex: 01310-100)"
                      value={cep}
                      onChange={handleCepChange}
                      onBlur={() => handleBlur("cep")}
                      className={getInputClass(validations.cep)}
                      disabled={loading}
                      maxLength={9}
                    />
                    <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2">
                      <AnimatePresence mode="wait">
                        {cepLoading ? (
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
                  <p className="text-[10px] text-gray-400">Digite o CEP para preencher cidade e estado automaticamente</p>
                </div>

                {/* Estado e Cidade */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Select
                      value={state}
                      onValueChange={(value) => {
                        setState(value);
                        handleBlur("state");
                      }}
                      disabled={loading}
                    >
                      <SelectTrigger className={`h-12 sm:h-14 ${validations.state.isTouched && !validations.state.isValid ? 'border-red-400' : ''}`}>
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {STATES.map((s) => (
                          <SelectItem key={s.uf} value={s.uf}>
                            {s.uf} - {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Cidade"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      onBlur={() => handleBlur("city")}
                      className={getInputClass(validations.city)}
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* E-mail */}
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="E-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => handleBlur("email")}
                    className={getInputClass(validations.email)}
                    disabled={loading}
                  />
                  <ValidationIcon validation={validations.email} />
                </div>

                {/* Senha */}
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Criar senha de acesso"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => handleBlur("password")}
                    className={getInputClass(validations.password, true)}
                    disabled={loading}
                  />
                  <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                      )}
                    </button>
                    {validations.password.isTouched && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        {validations.password.isValid ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : (
                          <X className="w-5 h-5 text-red-500" />
                        )}
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Password Requirements */}
                {touched.password && !validations.password.isValid && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="bg-gray-50 rounded-lg p-3 space-y-1"
                  >
                    <p className="text-xs text-gray-500 font-medium mb-2">A senha deve ter:</p>
                    {passwordRequirements.map((req, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {req.met ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <X className="w-4 h-4 text-gray-300" />
                        )}
                        <span className={`text-xs ${req.met ? 'text-green-600' : 'text-gray-500'}`}>
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </motion.div>
                )}

                {/* Terms Checkbox */}
                <div className="py-3 sm:py-4">
                  <label className="flex items-start gap-2.5 sm:gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => {
                        setAcceptTerms(e.target.checked);
                        setTouched(prev => ({ ...prev, acceptTerms: true }));
                      }}
                      className={`mt-0.5 sm:mt-1 w-4 h-4 sm:w-5 sm:h-5 rounded border-2 accent-amber-500 cursor-pointer transition-colors ${
                        touched.acceptTerms && !acceptTerms 
                          ? "border-red-500" 
                          : "border-gray-300"
                      }`}
                      disabled={loading}
                    />
                    <span className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                      Eu li, estou ciente das condições de tratamento dos meus dados pessoais e dou meu consentimento, quando aplicável, conforme descrito nesta{" "}
                      <Link 
                        to="/privacidade" 
                        className="text-amber-600 hover:text-amber-700 underline font-medium"
                        target="_blank"
                      >
                        Política de Privacidade
                      </Link>.
                    </span>
                  </label>
                  {touched.acceptTerms && !acceptTerms && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-xs mt-2 ml-8"
                    >
                      Você precisa aceitar para continuar
                    </motion.p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-12 sm:h-14 font-semibold text-sm sm:text-base text-gray-900 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, #FFC107 0%, #FFD54F 100%)"
                  }}
                  disabled={loading || !acceptTerms}
                >
                  {loading ? (
                    <>
                      <MascotSpinner size="sm" className="mr-2" />
                      Criando conta...
                    </>
                  ) : (
                    "Criar minha conta"
                  )}
                </Button>

                {/* Already have account */}
                <p className="text-center text-xs sm:text-sm text-gray-500 mt-4 sm:mt-6">
                  Já tem uma conta?{" "}
                  <button 
                    type="button"
                    onClick={onSwitchToLogin}
                    className="text-amber-600 hover:text-amber-700 font-medium"
                  >
                    Entrar
                  </button>
                </p>
              </form>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
