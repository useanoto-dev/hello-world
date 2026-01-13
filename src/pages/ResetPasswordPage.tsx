import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import anotoLogoFull from "@/assets/anoto-logo-full.png";
import { Eye, EyeOff, CheckCircle, Lock } from "lucide-react";
import { MascotSpinner } from "@/components/MascotSpinner";
import { motion } from "framer-motion";
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    // Check if user has a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check URL hash for recovery token
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      
      if (type === 'recovery' && accessToken) {
        setIsValidSession(true);
      } else if (session) {
        setIsValidSession(true);
      }
      
      setCheckingSession(false);
    };

    checkSession();

    // Listen for auth state changes (when user clicks recovery link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
        setCheckingSession(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setSuccess(true);
      toast.success("Senha alterada com sucesso!");
      
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error: any) {
      toast.error("Erro ao redefinir senha");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <MascotSpinner size="lg" />
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-2xl p-6 px-10 shadow-xl shadow-gray-300/50" style={{ backgroundColor: "#F1F2F3" }}>
          <div className="mb-5 flex justify-center">
            <img
              src={anotoLogoFull}
              alt="Anotô? - Pediu, chegou!"
              className="h-20 object-contain"
            />
          </div>
          <div className="text-center space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Link inválido ou expirado</h2>
            <p className="text-gray-600 text-sm">
              Este link de recuperação não é mais válido. Solicite um novo link.
            </p>
            <Button
              onClick={() => navigate("/esqueci-senha")}
              className="w-full h-11 bg-gray-800 hover:bg-gray-900 text-white font-semibold"
            >
              Solicitar novo link
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-2xl p-6 px-10 shadow-xl shadow-gray-300/50" style={{ backgroundColor: "#F1F2F3" }}>
          <div className="mb-5 flex justify-center">
            <img
              src={anotoLogoFull}
              alt="Anotô? - Pediu, chegou!"
              className="h-20 object-contain"
            />
          </div>
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Senha alterada!</h2>
            <p className="text-gray-600 text-sm">
              Sua senha foi alterada com sucesso. Redirecionando para o login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl p-6 px-10 shadow-xl shadow-gray-300/50" style={{ backgroundColor: "#F1F2F3" }}>
        {/* Logo completa */}
        <div className="mb-5 flex justify-center">
          <img
            src={anotoLogoFull}
            alt="Anotô? - Pediu, chegou!"
            className="h-20 object-contain"
          />
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Redefinir senha</h2>
          <p className="text-gray-600 text-sm mt-1">
            Digite sua nova senha abaixo.
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-700">
              Nova senha
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 bg-gray-50 border-gray-200 focus:border-gray-300 focus:ring-0 pl-10 pr-12"
                disabled={loading}
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-gray-700">
              Confirmar nova senha
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12 bg-gray-50 border-gray-200 focus:border-gray-300 focus:ring-0 pl-10 pr-12"
                disabled={loading}
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-11 bg-gray-800 hover:bg-gray-900 text-white font-semibold text-base"
            disabled={loading}
          >
            {loading ? (
              <>
                <MascotSpinner size="sm" className="mr-2" />
                Salvando...
              </>
            ) : (
              "Salvar nova senha"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
