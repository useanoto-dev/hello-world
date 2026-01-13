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

export default function TermsOfUse() {
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
          <h1 className="text-xl font-bold">Termos de Uso</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="prose prose-gray max-w-none">
          <p className="text-sm" style={{ color: COLORS.mutedForeground }}>
            Última atualização: 06 de janeiro de 2026
          </p>

          <section className="mt-8">
            <h2 className="text-2xl font-bold mb-4">1. Aceitação dos Termos</h2>
            <p style={{ color: COLORS.mutedForeground, lineHeight: 1.7 }}>
              Ao acessar ou usar a plataforma <strong>Anotô?</strong>, você concorda em cumprir estes Termos de Uso e todas as leis e regulamentos aplicáveis. Se você não concordar com algum destes termos, está proibido de usar ou acessar este serviço.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold mb-4">2. Descrição do Serviço</h2>
            <p style={{ color: COLORS.mutedForeground, lineHeight: 1.7 }}>
              A Anotô? é uma plataforma SaaS (Software as a Service) que oferece:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4" style={{ color: COLORS.mutedForeground }}>
              <li>Cardápio digital personalizado para estabelecimentos</li>
              <li>Sistema de gerenciamento de pedidos</li>
              <li>PDV (Ponto de Venda) integrado</li>
              <li>Gestão de mesas e comandas</li>
              <li>Programa de fidelidade</li>
              <li>Relatórios e análises</li>
              <li>Cupons de desconto</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold mb-4">3. Cadastro e Conta</h2>
            
            <h3 className="text-lg font-semibold mt-6 mb-3">3.1. Requisitos</h3>
            <ul className="list-disc pl-6 space-y-2" style={{ color: COLORS.mutedForeground }}>
              <li>Ter pelo menos 18 anos de idade</li>
              <li>Fornecer informações verdadeiras e completas</li>
              <li>Manter a segurança de sua senha</li>
              <li>Notificar imediatamente sobre uso não autorizado</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-3">3.2. Responsabilidades</h3>
            <p style={{ color: COLORS.mutedForeground, lineHeight: 1.7 }}>
              Você é responsável por todas as atividades realizadas em sua conta. A Anotô? não se responsabiliza por perdas decorrentes do uso não autorizado de sua conta.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold mb-4">4. Planos e Pagamentos</h2>
            
            <h3 className="text-lg font-semibold mt-6 mb-3">4.1. Período de Teste</h3>
            <p style={{ color: COLORS.mutedForeground, lineHeight: 1.7 }}>
              Novos usuários têm direito a um período de teste gratuito de 14 dias com acesso completo às funcionalidades. Após o período de teste, é necessário escolher um plano pago para continuar usando o serviço.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">4.2. Cobrança</h3>
            <ul className="list-disc pl-6 space-y-2" style={{ color: COLORS.mutedForeground }}>
              <li>Planos são cobrados mensalmente ou anualmente</li>
              <li>Renovação automática até cancelamento</li>
              <li>Preços podem ser alterados com aviso prévio de 30 dias</li>
              <li>Não há reembolso proporcional em caso de cancelamento</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-3">4.3. Inadimplência</h3>
            <p style={{ color: COLORS.mutedForeground, lineHeight: 1.7 }}>
              Em caso de não pagamento, o acesso ao painel administrativo será suspenso. O cardápio público permanecerá ativo por até 7 dias após o vencimento. Após 30 dias de inadimplência, a conta poderá ser cancelada.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold mb-4">5. Uso Aceitável</h2>
            
            <h3 className="text-lg font-semibold mt-6 mb-3">5.1. É Permitido</h3>
            <ul className="list-disc pl-6 space-y-2" style={{ color: COLORS.mutedForeground }}>
              <li>Usar a plataforma para fins comerciais legítimos</li>
              <li>Personalizar seu cardápio e configurações</li>
              <li>Integrar com serviços de pagamento autorizados</li>
              <li>Exportar seus próprios dados</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-3">5.2. É Proibido</h3>
            <ul className="list-disc pl-6 space-y-2" style={{ color: COLORS.mutedForeground }}>
              <li>Vender produtos ilegais ou regulamentados sem autorização</li>
              <li>Publicar conteúdo ofensivo, difamatório ou ilegal</li>
              <li>Tentar acessar sistemas ou dados de outros usuários</li>
              <li>Usar bots ou scripts automatizados sem autorização</li>
              <li>Revender ou sublicenciar o serviço</li>
              <li>Realizar engenharia reversa da plataforma</li>
              <li>Sobrecarregar intencionalmente os servidores</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold mb-4">6. Propriedade Intelectual</h2>
            
            <h3 className="text-lg font-semibold mt-6 mb-3">6.1. Nossa Propriedade</h3>
            <p style={{ color: COLORS.mutedForeground, lineHeight: 1.7 }}>
              A plataforma Anotô?, incluindo código, design, logotipos e marcas, são propriedade exclusiva da Anotô?. Você não adquire nenhum direito de propriedade intelectual ao usar nossos serviços.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">6.2. Seu Conteúdo</h3>
            <p style={{ color: COLORS.mutedForeground, lineHeight: 1.7 }}>
              Você mantém todos os direitos sobre o conteúdo que publica (fotos de produtos, descrições, etc.). Ao publicar, você nos concede licença para exibir esse conteúdo na plataforma.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold mb-4">7. Responsabilidades e Isenções</h2>
            
            <h3 className="text-lg font-semibold mt-6 mb-3">7.1. Disponibilidade</h3>
            <p style={{ color: COLORS.mutedForeground, lineHeight: 1.7 }}>
              Nos esforçamos para manter 99,9% de disponibilidade, mas não garantimos funcionamento ininterrupto. Manutenções programadas serão comunicadas com antecedência.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">7.2. Limitação de Responsabilidade</h3>
            <p style={{ color: COLORS.mutedForeground, lineHeight: 1.7 }}>
              A Anotô? não se responsabiliza por:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4" style={{ color: COLORS.mutedForeground }}>
              <li>Lucros cessantes ou perdas indiretas</li>
              <li>Qualidade dos produtos/serviços vendidos pelos estabelecimentos</li>
              <li>Disputas entre estabelecimentos e consumidores</li>
              <li>Problemas causados por terceiros (internet, pagamentos, etc.)</li>
              <li>Uso indevido da plataforma pelo usuário</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-3">7.3. Transações</h3>
            <p style={{ color: COLORS.mutedForeground, lineHeight: 1.7 }}>
              A Anotô? é uma plataforma intermediária. As transações comerciais são realizadas diretamente entre estabelecimentos e consumidores. Não somos parte nas vendas e não nos responsabilizamos por entregas, qualidade de produtos ou serviços.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold mb-4">8. Cancelamento</h2>
            
            <h3 className="text-lg font-semibold mt-6 mb-3">8.1. Pelo Usuário</h3>
            <ul className="list-disc pl-6 space-y-2" style={{ color: COLORS.mutedForeground }}>
              <li>Pode cancelar a qualquer momento pelo painel</li>
              <li>Acesso continua até o fim do período pago</li>
              <li>Dados podem ser exportados antes do cancelamento</li>
              <li>Após 30 dias do cancelamento, dados serão excluídos</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-3">8.2. Pela Anotô?</h3>
            <p style={{ color: COLORS.mutedForeground, lineHeight: 1.7 }}>
              Podemos suspender ou encerrar contas que violem estes termos, sem aviso prévio em casos graves (fraude, atividades ilegais, etc.).
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold mb-4">9. Indenização</h2>
            <p style={{ color: COLORS.mutedForeground, lineHeight: 1.7 }}>
              Você concorda em indenizar a Anotô? por quaisquer reclamações, perdas ou danos decorrentes do uso indevido da plataforma ou violação destes termos.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold mb-4">10. Alterações nos Termos</h2>
            <p style={{ color: COLORS.mutedForeground, lineHeight: 1.7 }}>
              Podemos modificar estes termos a qualquer momento. Mudanças significativas serão comunicadas por email ou aviso na plataforma com 30 dias de antecedência. O uso continuado após as alterações constitui aceitação dos novos termos.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold mb-4">11. Lei Aplicável e Foro</h2>
            <p style={{ color: COLORS.mutedForeground, lineHeight: 1.7 }}>
              Estes termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa será resolvida no foro da comarca de São Paulo/SP, com renúncia a qualquer outro, por mais privilegiado que seja.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold mb-4">12. Disposições Gerais</h2>
            <ul className="list-disc pl-6 space-y-2" style={{ color: COLORS.mutedForeground }}>
              <li>Se qualquer disposição for considerada inválida, as demais permanecem em vigor</li>
              <li>A falha em exercer qualquer direito não constitui renúncia</li>
              <li>Estes termos constituem o acordo integral entre as partes</li>
              <li>Nenhuma parceria ou vínculo empregatício é criado</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold mb-4">13. Contato</h2>
            <p style={{ color: COLORS.mutedForeground, lineHeight: 1.7 }}>
              Para dúvidas sobre estes Termos de Uso:
            </p>
            <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: COLORS.muted }}>
              <p style={{ color: COLORS.foreground }}><strong>Anotô? - Cardápio Digital Inteligente</strong></p>
              <p style={{ color: COLORS.mutedForeground }}>Email: contato@anoto.com.br</p>
              <p style={{ color: COLORS.mutedForeground }}>Suporte: suporte@anoto.com.br</p>
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
              onClick={() => navigate("/privacidade")}
              style={{ borderColor: COLORS.border, color: COLORS.foreground }}
            >
              Ver Política de Privacidade
            </Button>
          </div>
        </footer>
      </main>
    </div>
  );
}
