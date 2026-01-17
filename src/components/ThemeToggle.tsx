import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/useTheme";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  variant?: "default" | "simple" | "sidebar";
  collapsed?: boolean;
  compact?: boolean;
}

export function ThemeToggle({ variant = "default", collapsed = false, compact = false }: ThemeToggleProps) {
  const { theme, setTheme, isDark, toggleTheme } = useTheme();

  // Animated sidebar variant with sun/moon transition
  if (variant === "sidebar") {
    // Compact version for footer
    if (compact && !collapsed) {
      return (
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600 hover:text-gray-800 transition-colors"
          aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isDark ? (
              <motion.div
                key="sun"
                initial={{ rotate: -90, scale: 0, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: 90, scale: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <Sun className="w-3.5 h-3.5" />
              </motion.div>
            ) : (
              <motion.div
                key="moon"
                initial={{ rotate: 90, scale: 0, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: -90, scale: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <Moon className="w-3.5 h-3.5" />
              </motion.div>
            )}
          </AnimatePresence>
          <span>{isDark ? "Claro" : "Escuro"}</span>
        </button>
      );
    }

    // Compact collapsed version
    if (compact && collapsed) {
      return (
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-8 h-8 rounded-md text-gray-600 hover:text-gray-800 hover:bg-black/5 transition-all"
          aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isDark ? (
              <motion.div
                key="sun"
                initial={{ rotate: -90, scale: 0, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: 90, scale: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <Sun className="w-4 h-4" />
              </motion.div>
            ) : (
              <motion.div
                key="moon"
                initial={{ rotate: 90, scale: 0, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: -90, scale: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <Moon className="w-4 h-4" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      );
    }

    // Regular sidebar version
    return (
      <button
        onClick={toggleTheme}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg transition-all duration-200",
          "text-gray-800 hover:bg-black/5",
          collapsed ? "p-2 justify-center" : "px-3 py-2.5 w-full"
        )}
        aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      >
        <div className={cn(
          "flex items-center justify-center rounded-lg bg-white/70 text-gray-700",
          collapsed ? "w-9 h-9" : "w-8 h-8"
        )}>
          <AnimatePresence mode="wait" initial={false}>
            {isDark ? (
              <motion.div
                key="sun"
                initial={{ rotate: -90, scale: 0, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: 90, scale: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <Sun className="w-4 h-4" />
              </motion.div>
            ) : (
              <motion.div
                key="moon"
                initial={{ rotate: 90, scale: 0, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: -90, scale: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <Moon className="w-4 h-4" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ duration: 0.15 }}
              className="text-[13px] font-medium"
            >
              {isDark ? "Modo claro" : "Modo escuro"}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    );
  }

  if (variant === "simple") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="min-h-touch min-w-touch focus-ring"
        aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      >
        <div className="relative w-5 h-5 flex items-center justify-center">
          <AnimatePresence mode="wait" initial={false}>
            {isDark ? (
              <motion.div
                key="sun"
                initial={{ rotate: -90, scale: 0, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: 90, scale: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="absolute"
              >
                <Sun className="h-5 w-5" />
              </motion.div>
            ) : (
              <motion.div
                key="moon"
                initial={{ rotate: 90, scale: 0, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: -90, scale: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="absolute"
              >
                <Moon className="h-5 w-5 text-blue-900 dark:text-foreground" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="min-h-touch min-w-touch focus-ring"
          aria-label="Alterar tema"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Alterar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className="min-h-touch cursor-pointer"
        >
          <Sun className="mr-2 h-4 w-4" />
          <span>Claro</span>
          {theme === "light" && <span className="ml-auto text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className="min-h-touch cursor-pointer"
        >
          <Moon className="mr-2 h-4 w-4" />
          <span>Escuro</span>
          {theme === "dark" && <span className="ml-auto text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("system")}
          className="min-h-touch cursor-pointer"
        >
          <Monitor className="mr-2 h-4 w-4" />
          <span>Sistema</span>
          {theme === "system" && <span className="ml-auto text-primary">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
