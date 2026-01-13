import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePDVCart } from './usePDVCart';
import { OptionItem, OptionGroup } from './usePDVData';

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockItem: OptionItem = {
  id: 'prod-123',
  group_id: 'g1',
  name: 'Pizza Margherita',
  description: 'Classic pizza',
  image_url: null,
  additional_price: 45.90,
  promotional_price: null,
  promotion_start_at: null,
  promotion_end_at: null,
  is_active: true,
  category_id: 'cat1',
  category_name: 'Pizzas',
};

const mockInventoryItem: OptionItem = {
  id: 'inv-456',
  group_id: 'inv-g1',
  name: 'Coca-Cola 2L',
  description: null,
  image_url: null,
  additional_price: 12.00,
  promotional_price: null,
  promotion_start_at: null,
  promotion_end_at: null,
  is_active: true,
  category_id: 'inv-cat1',
  category_name: 'Bebidas',
};

const mockItemWithVariations: OptionItem = {
  ...mockItem,
  id: 'prod-789',
  variations: [
    { name: 'Pequena', price: 35.00 },
    { name: 'Grande', price: 55.00 },
  ],
};

const mockGetSecondaryGroups = vi.fn(() => []);
const mockGetGroupItems = vi.fn(() => []);
const mockAllOptionItems: OptionItem[] = [];

describe('usePDVCart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSecondaryGroups.mockReturnValue([]);
  });

  it('starts with empty cart', () => {
    const { result } = renderHook(() => 
      usePDVCart(mockGetSecondaryGroups, mockGetGroupItems, mockAllOptionItems)
    );

    expect(result.current.cart).toEqual([]);
    expect(result.current.cartTotal).toBe(0);
    expect(result.current.finalTotal).toBe(0);
  });

  it('adds inventory item directly to cart', () => {
    const { result } = renderHook(() => 
      usePDVCart(mockGetSecondaryGroups, mockGetGroupItems, mockAllOptionItems)
    );

    act(() => {
      result.current.openComplementsModal(mockInventoryItem);
    });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].item.name).toBe('Coca-Cola 2L');
    expect(result.current.cartTotal).toBe(12.00);
  });

  it('adds product without variations directly to cart', () => {
    const { result } = renderHook(() => 
      usePDVCart(mockGetSecondaryGroups, mockGetGroupItems, mockAllOptionItems)
    );

    act(() => {
      result.current.openComplementsModal(mockItem);
    });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].item.name).toBe('Pizza Margherita');
    expect(result.current.cartTotal).toBe(45.90);
  });

  it('opens variations modal for products with variations', () => {
    const { result } = renderHook(() => 
      usePDVCart(mockGetSecondaryGroups, mockGetGroupItems, mockAllOptionItems)
    );

    act(() => {
      result.current.openComplementsModal(mockItemWithVariations);
    });

    expect(result.current.isVariationsOpen).toBe(true);
    expect(result.current.productForVariation?.id).toBe('prod-789');
    expect(result.current.cart).toHaveLength(0);
  });

  it('adds product with selected variation', () => {
    const { result } = renderHook(() => 
      usePDVCart(mockGetSecondaryGroups, mockGetGroupItems, mockAllOptionItems)
    );

    act(() => {
      result.current.addToCartWithVariation(mockItemWithVariations, { name: 'Grande', price: 55.00 });
    });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].selectedVariation?.name).toBe('Grande');
    expect(result.current.cartTotal).toBe(55.00);
  });

  it('updates quantity correctly', () => {
    const { result } = renderHook(() => 
      usePDVCart(mockGetSecondaryGroups, mockGetGroupItems, mockAllOptionItems)
    );

    act(() => {
      result.current.openComplementsModal(mockItem);
    });

    const itemId = result.current.cart[0].id;

    act(() => {
      result.current.updateQuantity(itemId, 1);
    });

    expect(result.current.cart[0].quantity).toBe(2);
    expect(result.current.cartTotal).toBe(91.80);
  });

  it('removes item when quantity reaches zero', () => {
    const { result } = renderHook(() => 
      usePDVCart(mockGetSecondaryGroups, mockGetGroupItems, mockAllOptionItems)
    );

    act(() => {
      result.current.openComplementsModal(mockItem);
    });

    const itemId = result.current.cart[0].id;

    act(() => {
      result.current.updateQuantity(itemId, -1);
    });

    expect(result.current.cart).toHaveLength(0);
  });

  it('removes item from cart', () => {
    const { result } = renderHook(() => 
      usePDVCart(mockGetSecondaryGroups, mockGetGroupItems, mockAllOptionItems)
    );

    act(() => {
      result.current.openComplementsModal(mockItem);
    });

    const itemId = result.current.cart[0].id;

    act(() => {
      result.current.removeFromCart(itemId);
    });

    expect(result.current.cart).toHaveLength(0);
  });

  it('updates item notes', () => {
    const { result } = renderHook(() => 
      usePDVCart(mockGetSecondaryGroups, mockGetGroupItems, mockAllOptionItems)
    );

    act(() => {
      result.current.openComplementsModal(mockItem);
    });

    const itemId = result.current.cart[0].id;

    act(() => {
      result.current.updateItemNotes(itemId, 'Sem cebola');
    });

    expect(result.current.cart[0].notes).toBe('Sem cebola');
  });

  it('clears cart completely', () => {
    const { result } = renderHook(() => 
      usePDVCart(mockGetSecondaryGroups, mockGetGroupItems, mockAllOptionItems)
    );

    act(() => {
      result.current.openComplementsModal(mockItem);
      result.current.openComplementsModal(mockInventoryItem);
    });

    expect(result.current.cart).toHaveLength(2);

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.cart).toHaveLength(0);
    expect(result.current.customerName).toBe('Cliente Balcão');
    expect(result.current.appliedReward).toBeNull();
    expect(result.current.manualDiscount).toBeNull();
  });

  it('calculates discount correctly', () => {
    const { result } = renderHook(() => 
      usePDVCart(mockGetSecondaryGroups, mockGetGroupItems, mockAllOptionItems)
    );

    act(() => {
      result.current.openComplementsModal(mockItem);
    });

    expect(result.current.cartTotal).toBe(45.90);

    act(() => {
      result.current.setManualDiscount({ type: 'fixed', value: 10, discountAmount: 10 });
    });

    expect(result.current.manualDiscountAmount).toBe(10);
    expect(result.current.finalTotal).toBe(35.90);
  });

  it('prevents negative final total', () => {
    const { result } = renderHook(() => 
      usePDVCart(mockGetSecondaryGroups, mockGetGroupItems, mockAllOptionItems)
    );

    act(() => {
      result.current.openComplementsModal(mockItem);
    });

    act(() => {
      result.current.setManualDiscount({ type: 'fixed', value: 100, discountAmount: 100 });
    });

    expect(result.current.finalTotal).toBe(0);
  });
});
