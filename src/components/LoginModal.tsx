import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { X, Eye, EyeOff } from "lucide-react";
import { MascotSpinner } from "@/components/MascotSpinner";
import { motion, AnimatePresence } from "framer-motion";

// Logo URL
const anotoLogoFull = "https://felipedublin.com/wp-content/uploads/2026/01/anoto-logo-full.webp";

// Google icon component
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignup: () => void;
}

const handleGoogleLogin = async () => {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
    if (error) {
      toast.error("Erro ao conectar com Google");
      console.error(error);
    }
  } catch (error) {
    toast.error("Erro ao conectar com Google");
  }
};

export default function LoginModal({ isOpen, onClose, onSwitchToSignup }: LoginModalProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Lock body scroll when modal is open
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Email ou senha incorretos");
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success("Login realizado com sucesso!");
      onClose();
      navigate("/dashboard");
    } catch (error: any) {
      toast.error("Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  const getInputClass = () => {
    return "w-full h-12 sm:h-14 px-4 text-sm sm:text-base bg-gray-50 border-2 rounded-xl transition-all duration-200 focus:outline-none focus:bg-white border-gray-200 focus:border-amber-400";
  };

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
                src={anotoLogoFull} 
                alt="Anotô?" 
                className="h-12 xl:h-16 mx-auto mb-8"
              />
              
              <h1 className="text-2xl xl:text-4xl font-bold text-gray-900 leading-tight">
                Que bom te ver de volta!
              </h1>
              
              <p className="text-base xl:text-lg text-gray-800/80 mt-4">
                Acesse sua conta e continue gerenciando seu negócio
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
                  src={anotoLogoFull} 
                  alt="Anotô?" 
                  className="h-8 sm:h-10 mb-4 sm:mb-6"
                />
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
                  Que bom te ver de volta!
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-2">
                  Acesse sua conta para continuar
                </p>
              </div>

              <form 
                onSubmit={handleSubmit} 
                className="space-y-3 sm:space-y-4 max-w-md w-full mx-auto lg:mx-0"
              >
                {/* Google Login Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleLogin}
                  className="w-full h-12 sm:h-14 font-medium text-sm sm:text-base rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
                >
                  <GoogleIcon />
                  <span className="ml-2">Continuar com Google</span>
                </Button>

                {/* Divider */}
                <div className="relative py-2 sm:py-3">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-3 text-gray-500">ou</span>
                  </div>
                </div>

                {/* E-mail */}
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="E-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={getInputClass()}
                    disabled={loading}
                  />
                </div>

                {/* Senha */}
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${getInputClass()} pr-12`}
                    disabled={loading}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
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
                  </div>
                </div>

                {/* Forgot password link */}
                <div className="text-right">
                  <Link 
                    to="/esqueci-senha" 
                    onClick={onClose}
                    className="text-xs sm:text-sm text-amber-600 hover:text-amber-700 font-medium"
                  >
                    Esqueci minha senha
                  </Link>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-12 sm:h-14 font-semibold text-sm sm:text-base text-gray-900 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, #FFC107 0%, #FFD54F 100%)"
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <MascotSpinner size="sm" className="mr-2" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>

                {/* Create account link */}
                <p className="text-center text-xs sm:text-sm text-gray-500 mt-4 sm:mt-6">
                  Não tem uma conta?{" "}
                  <button 
                    type="button"
                    onClick={onSwitchToSignup}
                    className="text-amber-600 hover:text-amber-700 font-medium"
                  >
                    Criar conta grátis
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
