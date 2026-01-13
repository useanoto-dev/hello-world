// Service type options
export const SERVICE_OPTIONS = {
  delivery: { 
    id: "delivery",
    name: "Delivery", 
    icon: "🛵", 
    description: "Entrega rápida",
    color: "bg-red-100 text-red-800",
    image: "https://pizzariaportuguesa.site/wp-content/uploads/2025/08/delivery.webp"
  },
  pickup: { 
    id: "pickup",
    name: "Retirar no Local", 
    icon: "🏪", 
    description: "Retire no balcão",
    color: "bg-green-100 text-green-800",
    image: "https://pizzariaportuguesa.site/wp-content/uploads/2025/08/retirar.webp"
  },
  dine_in: { 
    id: "dine_in",
    name: "Consumir no Local", 
    icon: "🍽️", 
    description: "Desfrute aqui",
    color: "bg-yellow-100 text-yellow-800",
    image: "https://pizzariaportuguesa.site/wp-content/uploads/2025/08/consumir-no-local.webp"
  }
};

// Payment methods
export const PAYMENT_METHODS = {
  pix: { id: 'pix', label: 'PIX', description: 'Pagamento instantâneo', icon: '💠' },
  cartao_credito: { id: 'cartao_credito', label: 'Cartão de Crédito', description: 'Débito ou crédito na entrega', icon: '💳' },
  cartao_debito: { id: 'cartao_debito', label: 'Cartão de Débito', description: 'Débito na entrega', icon: '💳' },
  dinheiro: { id: 'dinheiro', label: 'Dinheiro', description: 'Pagamento em espécie', icon: '💵' },
};

// Drink categories (used in UI)
export const DRINK_CATEGORIES = [
  { id: "refrigerantes", name: "Refrigerantes", image: "https://pizzariaportuguesa.site/wp-content/uploads/2025/08/5.webp" },
  { id: "sucos", name: "Sucos", image: "https://pizzariaportuguesa.site/wp-content/uploads/2025/08/4.webp" },
  { id: "alcoolicas", name: "Alcoólicas", image: "https://pizzariaportuguesa.site/wp-content/uploads/2025/08/7.webp" },
  { id: "agua", name: "Água", image: "https://pizzariaportuguesa.site/wp-content/uploads/2025/08/6.webp" },
];
