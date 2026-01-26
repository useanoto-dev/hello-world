import { useEffect, useCallback } from "react";
import { toast } from "sonner";

interface PDVKeyboardShortcutsConfig {
  onFinishOrder?: () => void;
  onClearCart?: () => void;
  onToggleDiscount?: () => void;
  onSearchFocus?: () => void;
  onOpenTables?: () => void;
  onPrintLastOrder?: () => void;
  enabled?: boolean;
}

interface ShortcutInfo {
  key: string;
  description: string;
  category: string;
}

export const PDV_SHORTCUTS: ShortcutInfo[] = [
  { key: "F2", description: "Finalizar pedido", category: "Vendas" },
  { key: "F3", description: "Limpar carrinho", category: "Vendas" },
  { key: "F4", description: "Aplicar desconto", category: "Vendas" },
  { key: "F5", description: "Buscar produto", category: "Navegação" },
  { key: "F6", description: "Abrir mesas", category: "Navegação" },
  { key: "F8", description: "Reimprimir último", category: "Impressão" },
  { key: "Esc", description: "Cancelar/Fechar", category: "Geral" },
];

export function usePDVKeyboardShortcuts({
  onFinishOrder,
  onClearCart,
  onToggleDiscount,
  onSearchFocus,
  onOpenTables,
  onPrintLastOrder,
  enabled = true,
}: PDVKeyboardShortcutsConfig) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts if user is typing in an input
      const target = event.target as HTMLElement;
      const isInputField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Allow F5 (search) even in input fields
      if (isInputField && event.key !== "F5" && event.key !== "Escape") {
        return;
      }

      switch (event.key) {
        case "F2":
          event.preventDefault();
          if (onFinishOrder) {
            onFinishOrder();
            toast.info("⌨️ F2 - Finalizando pedido", { duration: 1500 });
          }
          break;

        case "F3":
          event.preventDefault();
          if (onClearCart) {
            onClearCart();
            toast.info("⌨️ F3 - Carrinho limpo", { duration: 1500 });
          }
          break;

        case "F4":
          event.preventDefault();
          if (onToggleDiscount) {
            onToggleDiscount();
            toast.info("⌨️ F4 - Desconto", { duration: 1500 });
          }
          break;

        case "F5":
          event.preventDefault();
          if (onSearchFocus) {
            onSearchFocus();
            // No toast for search - it's obvious
          }
          break;

        case "F6":
          event.preventDefault();
          if (onOpenTables) {
            onOpenTables();
            toast.info("⌨️ F6 - Mesas", { duration: 1500 });
          }
          break;

        case "F8":
          event.preventDefault();
          if (onPrintLastOrder) {
            onPrintLastOrder();
            toast.info("⌨️ F8 - Reimprimindo", { duration: 1500 });
          }
          break;

        case "Escape":
          // Escape is handled by individual modals
          break;
      }
    },
    [
      enabled,
      onFinishOrder,
      onClearCart,
      onToggleDiscount,
      onSearchFocus,
      onOpenTables,
      onPrintLastOrder,
    ]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, enabled]);

  return { shortcuts: PDV_SHORTCUTS };
}

// Component to display shortcuts help
export function PDVShortcutsHelp() {
  const groupedShortcuts = PDV_SHORTCUTS.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutInfo[]>);

  return (
    <div className="grid grid-cols-2 gap-4 text-sm">
      {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
        <div key={category}>
          <h4 className="font-medium text-muted-foreground mb-2 text-xs uppercase tracking-wide">
            {category}
          </h4>
          <div className="space-y-1.5">
            {shortcuts.map((shortcut) => (
              <div
                key={shortcut.key}
                className="flex items-center justify-between"
              >
                <span className="text-foreground">{shortcut.description}</span>
                <kbd className="px-2 py-0.5 text-xs font-mono bg-muted rounded border border-border">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
