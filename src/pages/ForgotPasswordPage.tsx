import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import anotoLogoFull from "@/assets/anoto-logo-full.png";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { MascotSpinner } from "@/components/MascotSpinner";
import { motion } from "framer-motion";
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Digite seu email");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Digite um email válido");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setEmailSent(true);
      toast.success("Email de recuperação enviado!");
    } catch (error: any) {
      toast.error("Erro ao enviar email de recuperação");
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
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

          {/* Success Message */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Email enviado!</h2>
            <p className="text-gray-600 text-sm">
              Enviamos um link de recuperação para <strong>{email}</strong>. 
              Verifique sua caixa de entrada e spam.
            </p>
            <Button
              onClick={() => setEmailSent(false)}
              variant="outline"
              className="w-full h-11 mt-4"
            >
              Enviar novamente
            </Button>
          </div>

          {/* Back to Home */}
          <p className="mt-6 text-center">
            <Link to="/" className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Voltar para o início
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      {/* Card */}
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
          <h2 className="text-lg font-semibold text-gray-900">Esqueceu sua senha?</h2>
          <p className="text-gray-600 text-sm mt-1">
            Digite seu email e enviaremos um link para redefinir sua senha.
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-700">
              Email
            </Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-gray-50 border-gray-200 focus:border-gray-300 focus:ring-0 pl-10"
                disabled={loading}
              />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
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
                Enviando...
              </>
            ) : (
              "Enviar link de recuperação"
            )}
          </Button>
        </form>

        {/* Back to Home */}
        <p className="mt-6 text-center">
          <Link to="/" className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Voltar para o início
          </Link>
        </p>
      </div>
    </div>
  );
}
