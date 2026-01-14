// Internationalization System
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'pt-BR' | 'en' | 'es';

interface I18nState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      language: 'pt-BR',
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'anoto-language',
    }
  )
);

// Translation function
export function t(key: string, params?: Record<string, string | number>): string {
  const { language } = useI18nStore.getState();
  const translations = getTranslations(language);
  
  let text = getNestedValue(translations, key) || key;
  
  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(value));
    });
  }
  
  return text;
}

function getNestedValue(obj: any, path: string): string | undefined {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function getTranslations(lang: Language) {
  switch (lang) {
    case 'en':
      return en;
    case 'es':
      return es;
    default:
      return ptBR;
  }
}

// Portuguese (Brazil) translations
const ptBR = {
  common: {
    save: 'Salvar',
    cancel: 'Cancelar',
    delete: 'Excluir',
    edit: 'Editar',
    add: 'Adicionar',
    close: 'Fechar',
    confirm: 'Confirmar',
    search: 'Buscar',
    filter: 'Filtrar',
    loading: 'Carregando...',
    error: 'Erro',
    success: 'Sucesso',
    warning: 'Atenção',
    yes: 'Sim',
    no: 'Não',
    back: 'Voltar',
    next: 'Próximo',
    previous: 'Anterior',
    today: 'Hoje',
    all: 'Todos',
    none: 'Nenhum',
    more: 'Mais',
    less: 'Menos',
  },
  auth: {
    login: 'Entrar',
    logout: 'Sair',
    signup: 'Cadastrar',
    email: 'E-mail',
    password: 'Senha',
    confirmPassword: 'Confirmar senha',
    forgotPassword: 'Esqueci minha senha',
    resetPassword: 'Redefinir senha',
    loginSuccess: 'Login realizado com sucesso!',
    logoutSuccess: 'Logout realizado com sucesso!',
    invalidCredentials: 'E-mail ou senha inválidos',
  },
  orders: {
    title: 'Pedidos',
    order: 'Pedido',
    orderNumber: 'Número do pedido',
    newOrder: 'Novo pedido',
    activeOrders: '{{count}} ativos',
    status: {
      pending: 'Pendente',
      confirmed: 'Confirmado',
      preparing: 'Preparando',
      ready: 'Pronto',
      delivering: 'Em entrega',
      delivered: 'Entregue',
      completed: 'Concluído',
      canceled: 'Cancelado',
    },
    filters: {
      active: 'Ativos',
      pending: 'Pendentes',
      completed: 'Concluídos',
    },
    summary: {
      sales: 'Vendas',
      orders: 'Pedidos',
      ticket: 'Ticket Médio',
    },
    noOrders: 'Nenhum pedido encontrado',
    items: '{{count}} itens',
    total: 'Total',
    subtotal: 'Subtotal',
    deliveryFee: 'Taxa de entrega',
    discount: 'Desconto',
  },
  settings: {
    title: 'Configurações',
    description: 'Gerencie as configurações do restaurante',
    saved: 'Configurações salvas com sucesso!',
    unsavedChanges: 'Você tem alterações não salvas',
    tabs: {
      general: 'Geral',
      operation: 'Operação',
      delivery: 'Delivery',
      contact: 'Contato',
      customize: 'Personalizar',
      print: 'Impressão',
      profile: 'Perfil',
    },
    store: {
      name: 'Nome do restaurante',
      logo: 'Logo',
      banner: 'Banner',
      about: 'Sobre nós',
    },
    schedule: {
      open: 'Aberto',
      closed: 'Fechado',
      automatic: 'Automático',
      forceOpen: 'Sempre aberto',
      forceClosed: 'Sempre fechado',
    },
  },
  menu: {
    title: 'Cardápio',
    products: 'Produtos',
    categories: 'Categorias',
    addProduct: 'Adicionar produto',
    addCategory: 'Adicionar categoria',
    price: 'Preço',
    description: 'Descrição',
    available: 'Disponível',
    unavailable: 'Indisponível',
    featured: 'Destaque',
  },
  cart: {
    title: 'Carrinho',
    empty: 'Seu carrinho está vazio',
    addItems: 'Adicione itens do cardápio',
    total: 'Total',
    checkout: 'Finalizar pedido',
    removeItem: 'Remover item',
    quantity: 'Quantidade',
  },
  checkout: {
    title: 'Finalizar pedido',
    service: 'Tipo de serviço',
    delivery: 'Entrega',
    pickup: 'Retirada',
    dineIn: 'No local',
    address: 'Endereço',
    payment: 'Pagamento',
    summary: 'Resumo',
    placeOrder: 'Fazer pedido',
    orderSuccess: 'Pedido realizado com sucesso!',
  },
  dashboard: {
    title: 'Dashboard',
    welcome: 'Bem-vindo de volta!',
    todaySales: 'Vendas de hoje',
    totalOrders: 'Total de pedidos',
    pendingOrders: 'Pedidos pendentes',
    avgTicket: 'Ticket médio',
  },
  customers: {
    title: 'Clientes',
    customer: 'Cliente',
    name: 'Nome',
    phone: 'Telefone',
    email: 'E-mail',
    totalOrders: 'Total de pedidos',
    totalSpent: 'Total gasto',
    lastOrder: 'Último pedido',
  },
  analytics: {
    title: 'Relatórios',
    salesByHour: 'Vendas por hora',
    salesByDay: 'Vendas por dia',
    topProducts: 'Produtos mais vendidos',
    serviceTypes: 'Tipos de serviço',
  },
  integrations: {
    title: 'Integrações',
    whatsapp: 'WhatsApp',
    print: 'Impressão',
    connected: 'Conectado',
    disconnected: 'Desconectado',
  },
  pwa: {
    installPrompt: 'Instale o app para uma melhor experiência',
    install: 'Instalar',
    offline: 'Você está offline',
    syncPending: 'Sincronização pendente',
  },
  errors: {
    generic: 'Ocorreu um erro. Tente novamente.',
    network: 'Erro de conexão. Verifique sua internet.',
    notFound: 'Não encontrado',
    unauthorized: 'Acesso não autorizado',
    validation: 'Verifique os campos e tente novamente',
  },
  time: {
    just_now: 'Agora mesmo',
    minutes_ago: 'há {{count}} minutos',
    hours_ago: 'há {{count}} horas',
    days_ago: 'há {{count}} dias',
  },
};

// English translations
const en = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    close: 'Close',
    confirm: 'Confirm',
    search: 'Search',
    filter: 'Filter',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    yes: 'Yes',
    no: 'No',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    today: 'Today',
    all: 'All',
    none: 'None',
    more: 'More',
    less: 'Less',
  },
  auth: {
    login: 'Login',
    logout: 'Logout',
    signup: 'Sign up',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm password',
    forgotPassword: 'Forgot password',
    resetPassword: 'Reset password',
    loginSuccess: 'Login successful!',
    logoutSuccess: 'Logout successful!',
    invalidCredentials: 'Invalid email or password',
  },
  orders: {
    title: 'Orders',
    order: 'Order',
    orderNumber: 'Order number',
    newOrder: 'New order',
    activeOrders: '{{count}} active',
    status: {
      pending: 'Pending',
      confirmed: 'Confirmed',
      preparing: 'Preparing',
      ready: 'Ready',
      delivering: 'Delivering',
      delivered: 'Delivered',
      completed: 'Completed',
      canceled: 'Canceled',
    },
    filters: {
      active: 'Active',
      pending: 'Pending',
      completed: 'Completed',
    },
    summary: {
      sales: 'Sales',
      orders: 'Orders',
      ticket: 'Avg Ticket',
    },
    noOrders: 'No orders found',
    items: '{{count}} items',
    total: 'Total',
    subtotal: 'Subtotal',
    deliveryFee: 'Delivery fee',
    discount: 'Discount',
  },
  settings: {
    title: 'Settings',
    description: 'Manage restaurant settings',
    saved: 'Settings saved successfully!',
    unsavedChanges: 'You have unsaved changes',
    tabs: {
      general: 'General',
      operation: 'Operation',
      delivery: 'Delivery',
      contact: 'Contact',
      customize: 'Customize',
      print: 'Print',
      profile: 'Profile',
    },
    store: {
      name: 'Restaurant name',
      logo: 'Logo',
      banner: 'Banner',
      about: 'About us',
    },
    schedule: {
      open: 'Open',
      closed: 'Closed',
      automatic: 'Automatic',
      forceOpen: 'Always open',
      forceClosed: 'Always closed',
    },
  },
  menu: {
    title: 'Menu',
    products: 'Products',
    categories: 'Categories',
    addProduct: 'Add product',
    addCategory: 'Add category',
    price: 'Price',
    description: 'Description',
    available: 'Available',
    unavailable: 'Unavailable',
    featured: 'Featured',
  },
  cart: {
    title: 'Cart',
    empty: 'Your cart is empty',
    addItems: 'Add items from the menu',
    total: 'Total',
    checkout: 'Checkout',
    removeItem: 'Remove item',
    quantity: 'Quantity',
  },
  checkout: {
    title: 'Checkout',
    service: 'Service type',
    delivery: 'Delivery',
    pickup: 'Pickup',
    dineIn: 'Dine in',
    address: 'Address',
    payment: 'Payment',
    summary: 'Summary',
    placeOrder: 'Place order',
    orderSuccess: 'Order placed successfully!',
  },
  dashboard: {
    title: 'Dashboard',
    welcome: 'Welcome back!',
    todaySales: "Today's sales",
    totalOrders: 'Total orders',
    pendingOrders: 'Pending orders',
    avgTicket: 'Average ticket',
  },
  customers: {
    title: 'Customers',
    customer: 'Customer',
    name: 'Name',
    phone: 'Phone',
    email: 'Email',
    totalOrders: 'Total orders',
    totalSpent: 'Total spent',
    lastOrder: 'Last order',
  },
  analytics: {
    title: 'Reports',
    salesByHour: 'Sales by hour',
    salesByDay: 'Sales by day',
    topProducts: 'Top products',
    serviceTypes: 'Service types',
  },
  integrations: {
    title: 'Integrations',
    whatsapp: 'WhatsApp',
    print: 'Print',
    connected: 'Connected',
    disconnected: 'Disconnected',
  },
  pwa: {
    installPrompt: 'Install the app for a better experience',
    install: 'Install',
    offline: "You're offline",
    syncPending: 'Sync pending',
  },
  errors: {
    generic: 'An error occurred. Please try again.',
    network: 'Connection error. Check your internet.',
    notFound: 'Not found',
    unauthorized: 'Unauthorized access',
    validation: 'Check the fields and try again',
  },
  time: {
    just_now: 'Just now',
    minutes_ago: '{{count}} minutes ago',
    hours_ago: '{{count}} hours ago',
    days_ago: '{{count}} days ago',
  },
};

// Spanish translations
const es = {
  common: {
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    add: 'Agregar',
    close: 'Cerrar',
    confirm: 'Confirmar',
    search: 'Buscar',
    filter: 'Filtrar',
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    warning: 'Atención',
    yes: 'Sí',
    no: 'No',
    back: 'Volver',
    next: 'Siguiente',
    previous: 'Anterior',
    today: 'Hoy',
    all: 'Todos',
    none: 'Ninguno',
    more: 'Más',
    less: 'Menos',
  },
  auth: {
    login: 'Iniciar sesión',
    logout: 'Cerrar sesión',
    signup: 'Registrarse',
    email: 'Correo electrónico',
    password: 'Contraseña',
    confirmPassword: 'Confirmar contraseña',
    forgotPassword: 'Olvidé mi contraseña',
    resetPassword: 'Restablecer contraseña',
    loginSuccess: '¡Inicio de sesión exitoso!',
    logoutSuccess: '¡Cierre de sesión exitoso!',
    invalidCredentials: 'Correo o contraseña inválidos',
  },
  orders: {
    title: 'Pedidos',
    order: 'Pedido',
    orderNumber: 'Número de pedido',
    newOrder: 'Nuevo pedido',
    activeOrders: '{{count}} activos',
    status: {
      pending: 'Pendiente',
      confirmed: 'Confirmado',
      preparing: 'Preparando',
      ready: 'Listo',
      delivering: 'En camino',
      delivered: 'Entregado',
      completed: 'Completado',
      canceled: 'Cancelado',
    },
    filters: {
      active: 'Activos',
      pending: 'Pendientes',
      completed: 'Completados',
    },
    summary: {
      sales: 'Ventas',
      orders: 'Pedidos',
      ticket: 'Ticket Promedio',
    },
    noOrders: 'No se encontraron pedidos',
    items: '{{count}} artículos',
    total: 'Total',
    subtotal: 'Subtotal',
    deliveryFee: 'Costo de envío',
    discount: 'Descuento',
  },
  settings: {
    title: 'Configuración',
    description: 'Administrar configuración del restaurante',
    saved: '¡Configuración guardada!',
    unsavedChanges: 'Tienes cambios sin guardar',
    tabs: {
      general: 'General',
      operation: 'Operación',
      delivery: 'Envío',
      contact: 'Contacto',
      customize: 'Personalizar',
      print: 'Impresión',
      profile: 'Perfil',
    },
    store: {
      name: 'Nombre del restaurante',
      logo: 'Logo',
      banner: 'Banner',
      about: 'Sobre nosotros',
    },
    schedule: {
      open: 'Abierto',
      closed: 'Cerrado',
      automatic: 'Automático',
      forceOpen: 'Siempre abierto',
      forceClosed: 'Siempre cerrado',
    },
  },
  menu: {
    title: 'Menú',
    products: 'Productos',
    categories: 'Categorías',
    addProduct: 'Agregar producto',
    addCategory: 'Agregar categoría',
    price: 'Precio',
    description: 'Descripción',
    available: 'Disponible',
    unavailable: 'No disponible',
    featured: 'Destacado',
  },
  cart: {
    title: 'Carrito',
    empty: 'Tu carrito está vacío',
    addItems: 'Agrega artículos del menú',
    total: 'Total',
    checkout: 'Finalizar pedido',
    removeItem: 'Quitar artículo',
    quantity: 'Cantidad',
  },
  checkout: {
    title: 'Finalizar pedido',
    service: 'Tipo de servicio',
    delivery: 'Envío',
    pickup: 'Recoger',
    dineIn: 'En el local',
    address: 'Dirección',
    payment: 'Pago',
    summary: 'Resumen',
    placeOrder: 'Hacer pedido',
    orderSuccess: '¡Pedido realizado con éxito!',
  },
  dashboard: {
    title: 'Dashboard',
    welcome: '¡Bienvenido de vuelta!',
    todaySales: 'Ventas de hoy',
    totalOrders: 'Total de pedidos',
    pendingOrders: 'Pedidos pendientes',
    avgTicket: 'Ticket promedio',
  },
  customers: {
    title: 'Clientes',
    customer: 'Cliente',
    name: 'Nombre',
    phone: 'Teléfono',
    email: 'Correo',
    totalOrders: 'Total de pedidos',
    totalSpent: 'Total gastado',
    lastOrder: 'Último pedido',
  },
  analytics: {
    title: 'Reportes',
    salesByHour: 'Ventas por hora',
    salesByDay: 'Ventas por día',
    topProducts: 'Productos más vendidos',
    serviceTypes: 'Tipos de servicio',
  },
  integrations: {
    title: 'Integraciones',
    whatsapp: 'WhatsApp',
    print: 'Impresión',
    connected: 'Conectado',
    disconnected: 'Desconectado',
  },
  pwa: {
    installPrompt: 'Instala la app para una mejor experiencia',
    install: 'Instalar',
    offline: 'Estás sin conexión',
    syncPending: 'Sincronización pendiente',
  },
  errors: {
    generic: 'Ocurrió un error. Intenta de nuevo.',
    network: 'Error de conexión. Verifica tu internet.',
    notFound: 'No encontrado',
    unauthorized: 'Acceso no autorizado',
    validation: 'Verifica los campos e intenta de nuevo',
  },
  time: {
    just_now: 'Ahora mismo',
    minutes_ago: 'hace {{count}} minutos',
    hours_ago: 'hace {{count}} horas',
    days_ago: 'hace {{count}} días',
  },
};

export { ptBR, en, es };
