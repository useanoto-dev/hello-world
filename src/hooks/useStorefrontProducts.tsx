// Hook for product selection and modal management in storefront
import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import type { Category, Product } from "./useStorefrontData";

interface ProductModalState {
  selectedProduct: Product | null;
  selectedCategory: Category | null;
  preselectedOptionId: string | null;
  showCustomizationModal: boolean;
  showProductDetailDrawer: boolean;
  simpleProduct: Product | null;
  simpleProductCategoryName: string;
}

interface UseStorefrontProductsProps {
  categories: Category[];
  categoryHasOptions: Map<string, boolean>;
  isStoreOpen: boolean;
}

export function useStorefrontProducts({
  categories,
  categoryHasOptions,
  isStoreOpen,
}: UseStorefrontProductsProps) {
  const [modalState, setModalState] = useState<ProductModalState>({
    selectedProduct: null,
    selectedCategory: null,
    preselectedOptionId: null,
    showCustomizationModal: false,
    showProductDetailDrawer: false,
    simpleProduct: null,
    simpleProductCategoryName: "",
  });

  const handleProductClick = useCallback((product: Product & { isVirtualProduct?: boolean; primaryOptionId?: string }) => {
    if (!isStoreOpen) {
      toast.error("Estabelecimento fechado", {
        description: "Não é possível adicionar itens ao carrinho no momento.",
      });
      return;
    }

    const isInventoryProduct = product.id.startsWith('inv-');
    const isStandardSizeProduct = product.id.startsWith('standard-size-');
    
    if (isInventoryProduct) {
      const category = categories.find(c => c.id === product.category_id);
      setModalState(prev => ({
        ...prev,
        simpleProduct: product,
        simpleProductCategoryName: category?.name || "Estoque",
        showProductDetailDrawer: true,
      }));
      return;
    }
    
    if (isStandardSizeProduct) {
      const category = categories.find(c => c.id === product.category_id);
      if (category && categoryHasOptions.has(category.id)) {
        const productForModal: Product = {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          promotional_price: product.promotional_price,
          image_url: product.image_url || category.image_url,
          category_id: category.id,
          is_featured: false,
        };
        setModalState(prev => ({
          ...prev,
          selectedProduct: productForModal,
          selectedCategory: category,
          preselectedOptionId: null,
          showCustomizationModal: true,
        }));
      } else {
        setModalState(prev => ({
          ...prev,
          simpleProduct: product,
          simpleProductCategoryName: category?.name || "Produto",
          showProductDetailDrawer: true,
        }));
      }
      return;
    }

    const category = categories.find(c => c.id === product.category_id);
    
    if (category) {
      const productForModal: Product = product.isVirtualProduct 
        ? {
            id: category.id,
            name: product.name,
            description: null,
            price: product.price,
            promotional_price: product.promotional_price,
            image_url: product.image_url || category.image_url,
            category_id: category.id,
            is_featured: false,
          }
        : product;
      
      if (categoryHasOptions.has(category.id)) {
        setModalState(prev => ({
          ...prev,
          selectedProduct: productForModal,
          selectedCategory: category,
          preselectedOptionId: product.isVirtualProduct ? product.primaryOptionId || null : null,
          showCustomizationModal: true,
        }));
      } else {
        setModalState(prev => ({
          ...prev,
          simpleProduct: product,
          simpleProductCategoryName: category.name,
          showProductDetailDrawer: true,
        }));
      }
    } else {
      setModalState(prev => ({
        ...prev,
        simpleProduct: product,
        simpleProductCategoryName: "Produto",
        showProductDetailDrawer: true,
      }));
    }
  }, [categories, isStoreOpen, categoryHasOptions]);

  const handleStandardItemSelect = useCallback((
    item: any, 
    size: any, 
    price: number, 
    _quantity: number,
    effectiveCategory: string | null
  ) => {
    const category = categories.find(c => c.id === effectiveCategory);
    if (category && categoryHasOptions.has(category.id)) {
      const productForModal: Product = {
        id: `${item.id}-${size.id}`,
        name: `${size.name} - ${item.name}`,
        description: item.description,
        price: price,
        promotional_price: null,
        image_url: item.image_url || size.image_url || category.image_url,
        category_id: category.id,
        is_featured: false,
      };
      setModalState(prev => ({
        ...prev,
        selectedProduct: productForModal,
        selectedCategory: category,
        preselectedOptionId: null,
        showCustomizationModal: true,
      }));
    } else {
      if (!isStoreOpen) {
        toast.error("Estabelecimento fechado", {
          description: "Não é possível adicionar itens ao carrinho no momento.",
        });
        return;
      }
      const productForDrawer: Product = {
        id: `${item.id}-${size.id}`,
        name: `${size.name}${item.name !== size.name ? ` - ${item.name}` : ''}`,
        description: item.description,
        price: price,
        promotional_price: null,
        image_url: item.image_url || size.image_url || undefined,
        category_id: effectiveCategory!,
        is_featured: false,
      };
      setModalState(prev => ({
        ...prev,
        simpleProduct: productForDrawer,
        simpleProductCategoryName: category?.name || "Produto",
        showProductDetailDrawer: true,
      }));
    }
  }, [categories, categoryHasOptions, isStoreOpen]);

  const closeCustomizationModal = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      showCustomizationModal: false,
      selectedProduct: null,
      selectedCategory: null,
      preselectedOptionId: null,
    }));
  }, []);

  const closeProductDetailDrawer = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      showProductDetailDrawer: false,
      simpleProduct: null,
    }));
  }, []);

  const resetAllModals = useCallback(() => {
    setModalState({
      selectedProduct: null,
      selectedCategory: null,
      preselectedOptionId: null,
      showCustomizationModal: false,
      showProductDetailDrawer: false,
      simpleProduct: null,
      simpleProductCategoryName: "",
    });
  }, []);

  return {
    ...modalState,
    handleProductClick,
    handleStandardItemSelect,
    closeCustomizationModal,
    closeProductDetailDrawer,
    resetAllModals,
  };
}
