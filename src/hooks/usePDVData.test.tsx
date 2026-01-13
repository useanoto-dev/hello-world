import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { getItemPrice, formatOccupationTime } from './usePDVData';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            gt: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        in: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        })),
      })),
    })),
  },
}));

describe('getItemPrice', () => {
  it('returns regular price when no promotion', () => {
    const item = {
      id: '1',
      group_id: 'g1',
      name: 'Test Item',
      description: null,
      image_url: null,
      additional_price: 29.90,
      promotional_price: null,
      promotion_start_at: null,
      promotion_end_at: null,
      is_active: true,
    };

    expect(getItemPrice(item)).toBe(29.90);
  });

  it('returns promotional price when active promotion', () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86400000);
    const tomorrow = new Date(now.getTime() + 86400000);

    const item = {
      id: '1',
      group_id: 'g1',
      name: 'Test Item',
      description: null,
      image_url: null,
      additional_price: 29.90,
      promotional_price: 19.90,
      promotion_start_at: yesterday.toISOString(),
      promotion_end_at: tomorrow.toISOString(),
      is_active: true,
    };

    expect(getItemPrice(item)).toBe(19.90);
  });

  it('returns regular price when promotion has not started', () => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 86400000);
    const dayAfterTomorrow = new Date(now.getTime() + 172800000);

    const item = {
      id: '1',
      group_id: 'g1',
      name: 'Test Item',
      description: null,
      image_url: null,
      additional_price: 29.90,
      promotional_price: 19.90,
      promotion_start_at: tomorrow.toISOString(),
      promotion_end_at: dayAfterTomorrow.toISOString(),
      is_active: true,
    };

    expect(getItemPrice(item)).toBe(29.90);
  });

  it('returns regular price when promotion has expired', () => {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 172800000);
    const yesterday = new Date(now.getTime() - 86400000);

    const item = {
      id: '1',
      group_id: 'g1',
      name: 'Test Item',
      description: null,
      image_url: null,
      additional_price: 29.90,
      promotional_price: 19.90,
      promotion_start_at: twoDaysAgo.toISOString(),
      promotion_end_at: yesterday.toISOString(),
      is_active: true,
    };

    expect(getItemPrice(item)).toBe(29.90);
  });

  it('returns promotional price when no date restrictions', () => {
    const item = {
      id: '1',
      group_id: 'g1',
      name: 'Test Item',
      description: null,
      image_url: null,
      additional_price: 29.90,
      promotional_price: 19.90,
      promotion_start_at: null,
      promotion_end_at: null,
      is_active: true,
    };

    expect(getItemPrice(item)).toBe(19.90);
  });
});

describe('formatOccupationTime', () => {
  it('returns empty string for null input', () => {
    expect(formatOccupationTime(null)).toBe('');
  });

  it('returns "agora" for less than 1 minute', () => {
    const now = new Date();
    expect(formatOccupationTime(now.toISOString())).toBe('agora');
  });

  it('returns minutes format for less than 1 hour', () => {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60000);
    expect(formatOccupationTime(thirtyMinsAgo.toISOString())).toBe('30min');
  });

  it('returns hours format for 1+ hours', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600000);
    expect(formatOccupationTime(twoHoursAgo.toISOString())).toBe('2h');
  });

  it('returns hours and minutes format', () => {
    const oneHour30MinsAgo = new Date(Date.now() - (90 * 60000));
    expect(formatOccupationTime(oneHour30MinsAgo.toISOString())).toBe('1h30min');
  });
});
