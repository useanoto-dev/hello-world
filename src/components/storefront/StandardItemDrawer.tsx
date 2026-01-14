// Standard Item Selection Drawer - For hamburgers, açaí, dishes, etc.
import { useState, useEffect, useMemo, useCallback } from "react";
import { X, Plus, Minus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface StandardSize {
  id: string;
  name: string;
  base_price: number;
}

interface StandardItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  item_type: string;
  is_premium: boolean;
}

interface ItemPrice {
  item_id: string;
  size_id: string;
  price: number;
}

interface StandardItemDrawerProps {
  open: boolean;
  onClose: () => void;
  categoryId: string;
  categoryName: string;
  storeId: string;
  onComplete: (data: {
    item: StandardItem;
    size: StandardSize;
    quantity: number;
    totalPrice: number;
  }) => void;
}

export function StandardItemDrawer({
  open,
  onClose,
  categoryId,
  categoryName,
  storeId,
  onComplete,
}: StandardItemDrawerProps) {
  const [selectedSize, setSelectedSize] = useState<StandardSize | null>(null);
  const [selectedItem, setSelectedItem] = useState<StandardItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [step, setStep] = useState<'size' | 'item'>('size');

  // Fetch sizes
  const { data: sizes = [] } = useQuery({
    queryKey: ['standard-sizes', categoryId],
    queryFn: async () => {
      const { data } = await supabase
        .from('standard_sizes')
        .select('id, name, base_price')
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .order('display_order');
      return (data as StandardSize[]) || [];
    },
    enabled: open && !!categoryId,
  });

  // Fetch items
  const { data: items = [] } = useQuery({
    queryKey: ['standard-items', categoryId],
    queryFn: async () => {
      const { data } = await supabase
        .from('standard_items')
        .select('id, name, description, image_url, item_type, is_premium')
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .order('display_order');
      return (data as StandardItem[]) || [];
    },
    enabled: open && !!categoryId,
  });

  // Fetch item prices
  const { data: itemPrices = [] } = useQuery({
    queryKey: ['standard-item-prices', categoryId, selectedSize?.id],
    queryFn: async () => {
      if (!selectedSize) return [];
      const { data } = await supabase
        .from('standard_item_prices')
        .select('item_id, size_id, price')
        .eq('size_id', selectedSize.id)
        .eq('is_available', true);
      return (data as ItemPrice[]) || [];
    },
    enabled: open && !!selectedSize,
  });

  // Reset state when drawer opens
  useEffect(() => {
    if (open) {
      setSelectedSize(null);
      setSelectedItem(null);
      setQuantity(1);
      setStep('size');
    }
  }, [open]);

  // Auto-select if only one size
  useEffect(() => {
    if (sizes.length === 1 && !selectedSize) {
      setSelectedSize(sizes[0]);
      setStep('item');
    }
  }, [sizes, selectedSize]);

  const getItemPrice = useCallback((itemId: string) => {
    const priceData = itemPrices.find(p => p.item_id === itemId);
    return priceData?.price || 0;
  }, [itemPrices]);

  const totalPrice = useMemo(() => {
    if (!selectedItem || !selectedSize) return 0;
    const itemPrice = getItemPrice(selectedItem.id);
    return (selectedSize.base_price + itemPrice) * quantity;
  }, [selectedItem, selectedSize, quantity, getItemPrice]);

  const handleSizeSelect = (size: StandardSize) => {
    setSelectedSize(size);
    setStep('item');
  };

  const handleItemSelect = (item: StandardItem) => {
    setSelectedItem(item);
  };

  const handleComplete = () => {
    if (!selectedItem || !selectedSize) return;
    onComplete({
      item: selectedItem,
      size: selectedSize,
      quantity,
      totalPrice,
    });
    onClose();
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="absolute bottom-0 left-0 right-0 max-h-[90vh] bg-white rounded-t-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">{categoryName}</h2>
              <p className="text-sm text-muted-foreground">
                {step === 'size' ? 'Escolha o tamanho' : 'Escolha o item'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[60vh] p-4">
            {step === 'size' && (
              <div className="grid grid-cols-2 gap-3">
                {sizes.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => handleSizeSelect(size)}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all",
                      selectedSize?.id === size.id
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-primary/50"
                    )}
                  >
                    <div className="font-semibold">{size.name}</div>
                    <div className="text-sm text-primary font-medium mt-1">
                      {formatCurrency(size.base_price)}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {step === 'item' && (
              <div className="space-y-3">
                {items.map((item) => {
                  const price = getItemPrice(item.id);
                  const isSelected = selectedItem?.id === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemSelect(item)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 hover:border-primary/50"
                      )}
                    >
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-2xl">
                          🍔
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold truncate">{item.name}</span>
                          {item.is_premium && (
                            <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                              Premium
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                            {item.description}
                          </p>
                        )}
                        {price > 0 && (
                          <div className="text-sm text-primary font-medium mt-1">
                            + {formatCurrency(price)}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {selectedItem && (
            <div className="sticky bottom-0 bg-white border-t p-4 space-y-3">
              {/* Quantity */}
              <div className="flex items-center justify-between">
                <span className="font-medium">Quantidade</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-full border flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 rounded-full border flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Add to cart button */}
              <Button
                onClick={handleComplete}
                className="w-full h-12 text-base font-semibold"
              >
                Adicionar • {formatCurrency(totalPrice)}
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
