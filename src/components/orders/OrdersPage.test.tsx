// Orders Page Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { OrdersHeader } from '@/components/orders/OrdersHeader';
import { OrdersSummaryCards } from '@/components/orders/OrdersSummaryCards';
import { OrdersList } from '@/components/orders/OrdersList';

describe('OrdersHeader', () => {
  const mockProps = {
    activeOrdersCount: 5,
    selectedDate: new Date('2024-01-15'),
    onPreviousDay: vi.fn(),
    onNextDay: vi.fn(),
    onToday: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the orders title', () => {
    const { getByText } = render(<OrdersHeader {...mockProps} />);
    expect(getByText('Pedidos')).toBeDefined();
  });

  it('shows active orders count', () => {
    const { getByText } = render(<OrdersHeader {...mockProps} />);
    expect(getByText('5 ativos')).toBeDefined();
  });

  it('calls onPreviousDay when previous button is clicked', () => {
    const { getAllByRole } = render(<OrdersHeader {...mockProps} />);
    const buttons = getAllByRole('button');
    buttons[0].click();
    expect(mockProps.onPreviousDay).toHaveBeenCalledTimes(1);
  });

  it('calls onNextDay when next button is clicked', () => {
    const { getAllByRole } = render(<OrdersHeader {...mockProps} />);
    const buttons = getAllByRole('button');
    buttons[2].click();
    expect(mockProps.onNextDay).toHaveBeenCalledTimes(1);
  });
});

describe('OrdersSummaryCards', () => {
  const mockSummary = {
    totalSold: 1500,
    totalOrders: 25,
    averageTicket: 60,
  };

  it('renders sales total', () => {
    const { getByText } = render(<OrdersSummaryCards summary={mockSummary} />);
    expect(getByText('R$ 1500')).toBeDefined();
  });

  it('renders orders count', () => {
    const { getByText } = render(<OrdersSummaryCards summary={mockSummary} />);
    expect(getByText('25')).toBeDefined();
  });

  it('renders average ticket', () => {
    const { getByText } = render(<OrdersSummaryCards summary={mockSummary} />);
    expect(getByText('R$ 60')).toBeDefined();
  });
});

describe('OrdersList', () => {
  const mockOrders = [
    {
      id: '1',
      order_number: 101,
      customer_name: 'João Silva',
      order_type: 'delivery',
      items: [{ name: 'Pizza', quantity: 1, price: 50 }],
      total: 55,
      status: 'pending',
      created_at: '2024-01-15T10:30:00Z',
    },
    {
      id: '2',
      order_number: 102,
      customer_name: 'Maria Santos',
      order_type: 'pickup',
      items: [{ name: 'Hambúrguer', quantity: 2, price: 30 }],
      total: 60,
      status: 'confirmed',
      created_at: '2024-01-15T11:00:00Z',
    },
  ];

  const mockOnViewOrder = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no orders', () => {
    const { getByText } = render(<OrdersList orders={[]} onViewOrder={mockOnViewOrder} />);
    expect(getByText('Nenhum pedido encontrado')).toBeDefined();
  });

  it('renders order numbers', () => {
    const { getByText } = render(<OrdersList orders={mockOrders} onViewOrder={mockOnViewOrder} />);
    expect(getByText('#101')).toBeDefined();
    expect(getByText('#102')).toBeDefined();
  });

  it('renders customer names', () => {
    const { getByText } = render(<OrdersList orders={mockOrders} onViewOrder={mockOnViewOrder} />);
    expect(getByText('João Silva')).toBeDefined();
    expect(getByText('Maria Santos')).toBeDefined();
  });

  it('renders order totals', () => {
    const { getByText } = render(<OrdersList orders={mockOrders} onViewOrder={mockOnViewOrder} />);
    expect(getByText('R$ 55.00')).toBeDefined();
    expect(getByText('R$ 60.00')).toBeDefined();
  });

  it('calls onViewOrder when view button is clicked', () => {
    const { getAllByRole } = render(<OrdersList orders={mockOrders} onViewOrder={mockOnViewOrder} />);
    const viewButtons = getAllByRole('button');
    viewButtons[0].click();
    expect(mockOnViewOrder).toHaveBeenCalledWith(mockOrders[0]);
  });
});
