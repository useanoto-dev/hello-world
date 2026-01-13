import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// Cores fixas da landing (consistente com a identidade visual)
const COLORS = {
  background: "#FFFFFF",
  foreground: "#1A1A1A",
  primary: "#FFC107",
  muted: "#F5F5F5",
  mutedForeground: "#757575",
  border: "#E0E0E0",
};

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", backgroundColor: COLORS.background, color: COLORS.foreground }}>
      {/* Header */}
      <header 
        style={{ 
          position: "sticky", 
          top: 0, 
          zIndex: 50, 
          backgroundColor: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(8px)",
          borderBottom: `1px solid ${COLORS.border}`
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            style={{ color: COLORS.foreground }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Política de Privacidade</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="prose prose-gray max-w-none">
          <p className="text-sm" style={{ color: COLORS.mutedForeground }}>
            Última atualização: 06 de janeiro de 2026
          </p>

          <section className="mt-8">
            <h2 className="text-2xl font-bold mb-4">1. Introdução</h2>
            <p style={{ color: COLORS.mutedForeground, lineHeight: 1.7 }}>
              A <strong>Anotô?</strong> ("nós", "nosso" ou "Anotô?") está comprometida em proteger a privacidade dos usuários de nossa plataforma de cardápio digital. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais quando você utiliza nossos serviços.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold mb-4">2. Dados que Coletamos</h2>
            
            <h3 className="text-lg font-semibold mt-6 mb-3">2.1. Dados dos Estabelecimentos (Lojistas)</h3>
            <ul className="list-disc pl-6 space-y-2" style={{ color: COLORS.mutedForeground }}>
              <li>Nome do estabelecimento e dados de contato</li>
              <li>Email e senha de acesso (senha armazenada de forma criptografada)</li>
              <li>Endereço comercial</li>
              <li>Dados de produtos, preços e cardápio</li>
              <li>Informações de pedidos e transações</li>
              <li>Dados bancários para recebimento (Pix)</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-3">2.2. Dados dos Consumidores</h3>
            <ul className="list-disc pl-6 space-y-2" style={{ color: COLORS.mutedForeground }}>
              <li>Nome e telefone para contato</li>
              <li>Endereço de entrega (quando aplicável)</li>
              <li>Histórico de pedidos</li>
              <li>Avaliações e comentários</li>
              <li>Dados de navegação e preferências</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold mb-4">3. Como Usamos seus Dados</h2>
            <ul className="list-disc pl-6 space-y-2" style={{ color: COLORS.mutedForeground }}>
              <li>Processar e gerenciar pedidos</li>
              <li>Comunicar sobre status de pedidos</li>
              <li>Melhorar nossos serviços e experiência do usuário</li>
              <li>Enviar comunicações relevantes sobre a plataforma</li>
              <li>Prevenir fraudes e garantir segurança</li>
              <li>Cumprir obrigações legais</li>
              <li>Gerar estatísticas anônimas para melhoria do serviço</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold mb-4">4. Compartilhamento de Dados</h2>
            <p style={{ color: COLORS.mutedForeground, lineHeight: 1.7 }}>
              Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins de marketing. Podemos compartilhar dados apenas:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4" style={{ color: COLORS.mutedForeground }}>
              <li><strong>Entre lojistas e consumidores:</strong> Para processar pedidos (ex: nome e telefone do cliente para o restaurante)</li>
              <li><strong>Provedores de serviço:</strong> Empresas que nos auxiliam na operação (hospedagem, processamento de pagamentos)</li>
              <li><strong>Obrigações legais:</strong> Quando exigido por lei ou autoridade competente</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold mb-4">5. Segurança dos Dados</h2>
            <p style={{ color: COLORS.mutedForeground, lineHeight: 1.7 }}>
              Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4" style={{ color: COLORS.mutedForeground }}>
              <li>Criptografia SSL/TLS para transmissão de dados</li>
              <li>Senhas armazenadas com hash seguro (nunca em texto plano)</li>
              <li>Controle de acesso baseado em funções (RLS - Row Level Security)</li>
              <li>Backups regulares e recuperação de desastres</li>
              <li>Monitoramento contínuo de segurança</li>
              <li>Infraestrutura hospedada em provedores certificados (Supabase)</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold mb-4">6. Seus Direitos (LGPD)</h2>
            <p style={{ color: COLORS.mutedForeground, lineHeight: 1.7 }}>
              De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4" style={{ color: COLORS.mutedForeground }}>
              <li><strong>Acesso:</strong> Solicitar cópia dos seus dados pessoais</li>
              <li><strong>Correção:</strong> Corrigir dados incompletos ou incorretos</li>
              <li><strong>Eliminação:</strong> Solicitar exclusão dos seus dados</li>
              <li><strong>Portabilidade:</strong> Receber seus dados em formato estruturado</li>
              <li><strong>Revogação:</strong> Retirar consentimento a qualquer momento</li>
              <li><strong>Informação:</strong> Saber com quem seus dados foram compartilhados</li>
            </ul>
            <p className="mt-4" style={{ color: COLORS.mutedForeground, lineHeight: 1.7 }}>
              Para exercer seus direitos, entre em contato através do email: <strong>privacidade@anoto.com.br</strong>
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold mb-4">7. Cookies e Tecnologias Similares</h2>
            <p style={{ color: COLORS.mutedForeground, lineHeight: 1.7 }}>
              Utilizamos cookies e armazenamento local para:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4" style={{ color: COLORS.mutedForeground }}>
              <li>Manter você logado em sua conta</li>
              <li>Lembrar preferências de navegação</li>
              <li>Armazenar itens do carrinho</li>
              <li>Analisar uso da plataforma para melhorias</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold mb-4">8. Retenção de Dados</h2>
            <p style={{ color: COLORS.mutedForeground, lineHeight: 1.7 }}>
              Mantemos seus dados pelo tempo necessário para fornecer os serviços ou conforme exigido por lei:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4" style={{ color: COLORS.mutedForeground }}>
              <li><strong>Dados de conta:</strong> Enquanto a conta estiver ativa</li>
              <li><strong>Dados de pedidos:</strong> 5 anos (obrigação fiscal)</li>
              <li><strong>Logs de acesso:</strong> 6 meses</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold mb-4">9. Menores de Idade</h2>
            <p style={{ color: COLORS.mutedForeground, lineHeight: 1.7 }}>
              Nossos serviços não são direcionados a menores de 18 anos. Não coletamos intencionalmente dados de menores. Caso identifiquemos dados de menores, estes serão excluídos imediatamente.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold mb-4">10. Alterações nesta Política</h2>
            <p style={{ color: COLORS.mutedForeground, lineHeight: 1.7 }}>
              Podemos atualizar esta política periodicamente. Notificaremos sobre mudanças significativas através de email ou aviso na plataforma. Recomendamos revisar esta página regularmente.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold mb-4">11. Contato</h2>
            <p style={{ color: COLORS.mutedForeground, lineHeight: 1.7 }}>
              Para dúvidas sobre esta Política de Privacidade ou sobre o tratamento de seus dados:
            </p>
            <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: COLORS.muted }}>
              <p style={{ color: COLORS.foreground }}><strong>Anotô? - Cardápio Digital Inteligente</strong></p>
              <p style={{ color: COLORS.mutedForeground }}>Email: privacidade@anoto.com.br</p>
              <p style={{ color: COLORS.mutedForeground }}>Encarregado de Dados (DPO): dpo@anoto.com.br</p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t" style={{ borderColor: COLORS.border }}>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm" style={{ color: COLORS.mutedForeground }}>
              © 2026 Anotô? - Todos os direitos reservados
            </p>
            <Button
              variant="outline"
              onClick={() => navigate("/termos")}
              style={{ borderColor: COLORS.border, color: COLORS.foreground }}
            >
              Ver Termos de Uso
            </Button>
          </div>
        </footer>
      </main>
    </div>
  );
}
