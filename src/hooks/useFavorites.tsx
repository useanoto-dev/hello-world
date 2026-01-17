// Hook for managing favorite products
import { useState, useEffect, useCallback, useMemo } from "react";

const STORAGE_KEY = "product_favorites";

interface UseFavoritesReturn {
  favorites: Set<string>;
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => void;
  addFavorite: (productId: string) => void;
  removeFavorite: (productId: string) => void;
  clearFavorites: () => void;
  favoritesCount: number;
}

export function useFavorites(storeId?: string): UseFavoritesReturn {
  const storageKey = storeId ? `${STORAGE_KEY}_${storeId}` : STORAGE_KEY;
  
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Set(Array.isArray(parsed) ? parsed : []);
      }
    } catch (e) {
      console.error("Error loading favorites:", e);
    }
    return new Set();
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...favorites]));
    } catch (e) {
      console.error("Error saving favorites:", e);
    }
  }, [favorites, storageKey]);

  const isFavorite = useCallback((productId: string): boolean => {
    return favorites.has(productId);
  }, [favorites]);

  const addFavorite = useCallback((productId: string) => {
    setFavorites(prev => new Set([...prev, productId]));
  }, []);

  const removeFavorite = useCallback((productId: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((productId: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }, []);

  const clearFavorites = useCallback(() => {
    setFavorites(new Set());
  }, []);

  const favoritesCount = useMemo(() => favorites.size, [favorites]);

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    clearFavorites,
    favoritesCount,
  };
}
