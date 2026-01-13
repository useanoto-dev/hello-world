import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

interface ProductSearchProps {
  onSearch: (query: string) => void;
}

export default function ProductSearch({ onSearch }: ProductSearchProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, onSearch]);

  const clearSearch = () => {
    setQuery("");
    onSearch("");
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-3 sm:px-4 py-3"
    >
      <div className={`
        relative rounded-xl transition-all duration-200
        ${isFocused ? 'ring-2 ring-primary/50 shadow-lg' : 'shadow-sm'}
      `}>
        <Search className={`
          absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors
          ${isFocused ? 'text-primary' : 'text-muted-foreground'}
        `} />
        <Input
          type="text"
          placeholder="Buscar no cardápio..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="h-12 pl-12 pr-12 bg-surface/80 backdrop-blur-sm border-border/50 rounded-xl text-base focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full bg-muted text-muted-foreground hover:text-foreground hover:bg-muted-foreground/20 transition-colors"
            aria-label="Limpar busca"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
