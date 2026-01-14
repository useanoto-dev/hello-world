// Optimized List Component - For rendering large lists efficiently
import { memo, useCallback, useRef, useState, useEffect, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface OptimizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
  itemHeight?: number;
  overscan?: number;
  className?: string;
  emptyState?: ReactNode;
  loading?: boolean;
  loadingSkeleton?: ReactNode;
}

function OptimizedListInner<T>({
  items,
  renderItem,
  keyExtractor,
  itemHeight = 60,
  overscan = 5,
  className,
  emptyState,
  loading,
  loadingSkeleton,
}: OptimizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Update container height on resize
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    observer.observe(containerRef.current);
    setContainerHeight(containerRef.current.clientHeight);

    return () => observer.disconnect();
  }, []);

  // Handle scroll with throttling
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);
  }, []);

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetTop = startIndex * itemHeight;
  const totalHeight = items.length * itemHeight;

  // Loading state
  if (loading && loadingSkeleton) {
    return <div className={className}>{loadingSkeleton}</div>;
  }

  // Empty state
  if (!loading && items.length === 0 && emptyState) {
    return <div className={className}>{emptyState}</div>;
  }

  // If list is small, render normally without virtualization
  if (items.length <= 50) {
    return (
      <div className={cn("overflow-auto", className)}>
        {items.map((item, index) => (
          <div key={keyExtractor(item, index)}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    );
  }

  // Virtualized rendering for large lists
  return (
    <div
      ref={containerRef}
      className={cn("overflow-auto", className)}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: offsetTop,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, localIndex) => {
            const actualIndex = startIndex + localIndex;
            return (
              <div
                key={keyExtractor(item, actualIndex)}
                style={{ height: itemHeight }}
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export const OptimizedList = memo(OptimizedListInner) as typeof OptimizedListInner;

// Simple list for small datasets with animation support
interface SimpleListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
  className?: string;
  emptyState?: ReactNode;
  animated?: boolean;
}

export function SimpleList<T>({
  items,
  renderItem,
  keyExtractor,
  className,
  emptyState,
  animated = false,
}: SimpleListProps<T>) {
  if (items.length === 0 && emptyState) {
    return <div className={className}>{emptyState}</div>;
  }

  return (
    <div className={className}>
      {items.map((item, index) => (
        <div
          key={keyExtractor(item, index)}
          className={animated ? "animate-fade-in" : ""}
          style={animated ? { animationDelay: `${index * 50}ms` } : undefined}
        >
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}

export default OptimizedList;
