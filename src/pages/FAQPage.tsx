import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, Search, HelpCircle, CreditCard, Smartphone, Shield, Users, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

// Cores fixas da landing (consistente com a identidade visual)
const COLORS = {
  background: "#FFFFFF",
  foreground: "#1A1A1A",
  primary: "#FFC107",
  primaryDark: "#FFB300",
  muted: "#F5F5F5",
  mutedForeground: "#757575",
  border: "#E0E0E0",
};

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  items: FAQItem[];
}

const faqCategories: FAQCategory[] = [
  {
    id: "geral",
    name: "Geral",
    icon: <HelpCircle className="w-5 h-5" />,
    items: [
      {
        question: "O que é o Anotô?",
        answer: "O Anotô? é uma plataforma SaaS de cardápio digital inteligente para restaurantes, pizzarias, lanchonetes e outros estabelecimentos do ramo alimentício. Permite criar um cardápio online personalizado, gerenciar pedidos, aceitar pagamentos e muito mais."
      },
      {
        question: "Como funciona o período de teste gratuito?",
        answer: "Você tem 7 dias para testar todas as funcionalidades da plataforma sem custo. Não é necessário cartão de crédito para começar. Após o período de teste, você pode escolher um plano pago para continuar usando."
      },
      {
        question: "Preciso ter conhecimento técnico para usar?",
        answer: "Não! O Anotô? foi criado para ser simples e intuitivo. Você consegue configurar seu cardápio em poucos minutos, mesmo sem experiência com tecnologia. Nosso assistente de configuração guia você em cada etapa."
      },
      {
        question: "Posso usar em mais de um estabelecimento?",
        answer: "Cada assinatura é válida para um estabelecimento. Se você tem mais de uma loja, precisará de uma assinatura separada para cada uma. Oferecemos descontos especiais para múltiplas unidades - entre em contato conosco."
      },
      {
        question: "O Anotô? funciona offline?",
        answer: "O cardápio pode ser instalado como um app (PWA) e funciona parcialmente offline para visualização. Porém, para realizar pedidos e sincronizar dados, é necessária conexão com a internet."
      }
    ]
  },
  {
    id: "pagamentos",
    name: "Pagamentos e Planos",
    icon: <CreditCard className="w-5 h-5" />,
    items: [
      {
        question: "Quais são as formas de pagamento aceitas?",
        answer: "Aceitamos pagamento via Pix, cartão de crédito e boleto bancário. O pagamento pode ser mensal ou anual (com desconto)."
      },
      {
        question: "Posso cancelar a qualquer momento?",
        answer: "Sim! Você pode cancelar sua assinatura a qualquer momento pelo painel administrativo. O acesso continua até o fim do período já pago, sem cobranças adicionais."
      },
      {
        question: "O Anotô? cobra comissão sobre vendas?",
        answer: "Não! Diferente de outros serviços, o Anotô? cobra apenas uma mensalidade fixa. Você fica com 100% das suas vendas, sem taxas ou comissões."
      },
      {
        question: "Existe taxa de adesão ou instalação?",
        answer: "Não há nenhuma taxa de adesão, instalação ou custos ocultos. Você paga apenas a mensalidade do plano escolhido."
      },
      {
        question: "O que acontece se eu atrasar o pagamento?",
        answer: "Após o vencimento, você tem 7 dias de tolerância. Durante esse período, o cardápio continua funcionando normalmente. Após 7 dias, o painel administrativo é bloqueado, mas o cardápio público permanece ativo por mais alguns dias."
      }
    ]
  },
  {
    id: "cardapio",
    name: "Cardápio e Produtos",
    icon: <Smartphone className="w-5 h-5" />,
    items: [
      {
        question: "Quantos produtos posso cadastrar?",
        answer: "Não há limite! Você pode cadastrar quantos produtos e categorias precisar em qualquer plano."
      },
      {
        question: "Posso personalizar as cores e logo?",
        answer: "Sim! Você pode personalizar a cor principal, adicionar seu logo, banner e configurar todo o visual do seu cardápio para combinar com sua marca."
      },
      {
        question: "Os clientes precisam baixar algum app?",
        answer: "Não! Seus clientes acessam o cardápio diretamente pelo navegador, escaneando um QR Code ou acessando o link. Opcionalmente, podem instalar como um app (PWA) para acesso rápido."
      },
      {
        question: "Posso criar promoções e cupons de desconto?",
        answer: "Sim! O Anotô? tem um sistema completo de cupons de desconto com controle de uso, validade e valor mínimo de pedido."
      },
      {
        question: "É possível ter um cardápio diferente para delivery e mesa?",
        answer: "Sim! Você pode configurar produtos e preços diferentes para cada tipo de atendimento (delivery, retirada, mesa)."
      }
    ]
  },
  {
    id: "pedidos",
    name: "Pedidos e Atendimento",
    icon: <Users className="w-5 h-5" />,
    items: [
      {
        question: "Como recebo os pedidos?",
        answer: "Os pedidos aparecem em tempo real no seu painel administrativo. Você também pode configurar notificações sonoras e por push para não perder nenhum pedido."
      },
      {
        question: "Posso imprimir comandas?",
        answer: "Sim! O Anotô? suporta impressão de comandas em impressoras térmicas (58mm e 80mm). Você pode configurar o formato e quais informações aparecem na comanda."
      },
      {
        question: "Tem sistema de mesas e comandas?",
        answer: "Sim! Você pode gerenciar mesas, abrir comandas, adicionar itens ao longo do atendimento e fechar a conta de forma simples e organizada."
      },
      {
        question: "Posso configurar áreas de entrega?",
        answer: "Sim! Você pode criar diferentes áreas de entrega com taxas e tempos estimados personalizados para cada região."
      },
      {
        question: "Existe programa de fidelidade?",
        answer: "Sim! O Anotô? tem um sistema de pontos e fidelidade integrado. Seus clientes acumulam pontos a cada compra e podem trocar por descontos ou produtos."
      }
    ]
  },
  {
    id: "seguranca",
    name: "Segurança e Dados",
    icon: <Shield className="w-5 h-5" />,
    items: [
      {
        question: "Meus dados estão seguros?",
        answer: "Sim! Utilizamos criptografia SSL/TLS, armazenamento seguro de senhas (hash) e infraestrutura de nível empresarial. Seus dados são protegidos seguindo as melhores práticas de segurança."
      },
      {
        question: "O Anotô? está em conformidade com a LGPD?",
        answer: "Sim! Seguimos todas as diretrizes da Lei Geral de Proteção de Dados (LGPD). Você pode consultar nossa Política de Privacidade para mais detalhes."
      },
      {
        question: "Posso exportar meus dados?",
        answer: "Sim! Você pode exportar relatórios de vendas, lista de clientes e outros dados a qualquer momento pelo painel administrativo."
      },
      {
        question: "O que acontece com meus dados se eu cancelar?",
        answer: "Após o cancelamento, seus dados são mantidos por 30 dias caso você deseje reativar a conta. Após esse período, todos os dados são permanentemente excluídos de nossos servidores."
      }
    ]
  },
  {
    id: "tecnico",
    name: "Suporte Técnico",
    icon: <Settings className="w-5 h-5" />,
    items: [
      {
        question: "Como entro em contato com o suporte?",
        answer: "Você pode entrar em contato pelo email suporte@anoto.com.br ou pelo chat dentro do painel administrativo. Nosso horário de atendimento é de segunda a sexta, das 9h às 18h."
      },
      {
        question: "Vocês oferecem treinamento?",
        answer: "No plano anual, oferecemos uma consultoria inicial para ajudar você a configurar tudo da melhor forma. Também disponibilizamos tutoriais em vídeo e documentação completa."
      },
      {
        question: "O sistema fica fora do ar com frequência?",
        answer: "Não! Mantemos uma disponibilidade de 99,9%. Manutenções programadas são realizadas em horários de baixo movimento e comunicadas com antecedência."
      },
      {
        question: "Posso sugerir novas funcionalidades?",
        answer: "Claro! Adoramos ouvir nossos usuários. Você pode enviar sugestões pelo painel ou email. Muitas funcionalidades do Anotô? vieram de sugestões de clientes."
      }
    ]
  }
];

export default function FAQPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("geral");
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleItem = (question: string) => {
    setExpandedItems(prev => 
      prev.includes(question) 
        ? prev.filter(q => q !== question)
        : [...prev, question]
    );
  };

  // Filter FAQ items based on search
  const filteredCategories = faqCategories.map(category => ({
    ...category,
    items: category.items.filter(item =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.items.length > 0);

  const displayCategories = searchQuery ? filteredCategories : faqCategories;
  const currentCategory = displayCategories.find(c => c.id === activeCategory) || displayCategories[0];

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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            style={{ color: COLORS.foreground }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Perguntas Frequentes</h1>
        </div>
      </header>

      {/* Hero Section */}
      <section 
        className="px-4 sm:px-6 py-10 sm:py-16"
        style={{ background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)` }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: COLORS.foreground }}>
            Como podemos ajudar?
          </h2>
          <p className="text-sm sm:text-base mb-6" style={{ color: "#424242" }}>
            Encontre respostas para as dúvidas mais comuns sobre o Anotô?
          </p>
          
          {/* Search */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar pergunta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-base rounded-xl border-0 shadow-lg"
              style={{ backgroundColor: COLORS.background }}
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Category Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="lg:sticky lg:top-24">
              <h3 className="text-sm font-semibold mb-3" style={{ color: COLORS.mutedForeground }}>
                CATEGORIAS
              </h3>
              <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                {displayCategories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left whitespace-nowrap transition-all ${
                      activeCategory === category.id
                        ? "bg-amber-100 text-amber-900 font-medium"
                        : "hover:bg-gray-100 text-gray-600"
                    }`}
                    style={{ 
                      border: activeCategory === category.id ? "none" : "none"
                    }}
                  >
                    {category.icon}
                    <span className="text-sm">{category.name}</span>
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                      {category.items.length}
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* FAQ Items */}
          <div className="flex-1">
            {currentCategory && (
              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  {currentCategory.icon}
                  {currentCategory.name}
                </h3>
                
                <div className="space-y-3">
                  {currentCategory.items.map((item, index) => (
                    <motion.div
                      key={item.question}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border rounded-lg overflow-hidden"
                      style={{ borderColor: COLORS.border }}
                    >
                      <button
                        onClick={() => toggleItem(item.question)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-medium text-sm sm:text-base pr-4">{item.question}</span>
                        <motion.div
                          animate={{ rotate: expandedItems.includes(item.question) ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="w-5 h-5 flex-shrink-0" style={{ color: COLORS.mutedForeground }} />
                        </motion.div>
                      </button>
                      
                      <AnimatePresence>
                        {expandedItems.includes(item.question) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div 
                              className="px-4 pb-4 text-sm leading-relaxed"
                              style={{ color: COLORS.mutedForeground }}
                            >
                              {item.answer}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {searchQuery && displayCategories.length === 0 && (
              <div className="text-center py-12">
                <HelpCircle className="w-12 h-12 mx-auto mb-4" style={{ color: COLORS.mutedForeground }} />
                <h3 className="text-lg font-semibold mb-2">Nenhum resultado encontrado</h3>
                <p className="text-sm" style={{ color: COLORS.mutedForeground }}>
                  Tente buscar por outras palavras ou entre em contato conosco.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Contact CTA */}
        <div 
          className="mt-12 p-6 sm:p-8 rounded-2xl text-center"
          style={{ backgroundColor: COLORS.muted }}
        >
          <h3 className="text-lg sm:text-xl font-bold mb-2">Ainda tem dúvidas?</h3>
          <p className="text-sm mb-4" style={{ color: COLORS.mutedForeground }}>
            Nossa equipe está pronta para ajudar você
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => window.open("mailto:suporte@anoto.com.br")}
              style={{ backgroundColor: COLORS.primary, color: COLORS.foreground }}
            >
              Falar com Suporte
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/privacidade")}
              style={{ borderColor: COLORS.border }}
            >
              Ver Política de Privacidade
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-4 sm:px-6 py-6" style={{ borderTop: `1px solid ${COLORS.border}` }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm" style={{ color: COLORS.mutedForeground }}>
            © {new Date().getFullYear()} Anotô? - Todos os direitos reservados
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => navigate("/termos")}
              className="text-sm hover:underline"
              style={{ color: COLORS.mutedForeground, background: "none", border: "none", cursor: "pointer" }}
            >
              Termos de Uso
            </button>
            <button
              onClick={() => navigate("/privacidade")}
              className="text-sm hover:underline"
              style={{ color: COLORS.mutedForeground, background: "none", border: "none", cursor: "pointer" }}
            >
              Privacidade
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
