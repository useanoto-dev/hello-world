import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

// Custom drag handle icon (6 dots pattern like Anota AI)
const DragHandle = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 16 20" 
    fill="none" 
    className={className}
    style={{ width: 20, height: 20 }}
  >
    <circle cx="4" cy="4" r="1.5" fill="currentColor" />
    <circle cx="12" cy="4" r="1.5" fill="currentColor" />
    <circle cx="4" cy="10" r="1.5" fill="currentColor" />
    <circle cx="12" cy="10" r="1.5" fill="currentColor" />
    <circle cx="4" cy="16" r="1.5" fill="currentColor" />
    <circle cx="12" cy="16" r="1.5" fill="currentColor" />
  </svg>
);

interface SortableCategoryItemProps {
  id: string;
  children: React.ReactNode;
  isActive: boolean;
}

export function SortableCategoryItem({ id, children, isActive }: SortableCategoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "border rounded-xl overflow-hidden transition-all",
        !isActive && "opacity-60",
        isDragging && "opacity-50 shadow-lg z-50 ring-2 ring-primary"
      )}
    >
      {children}
    </div>
  );
}

interface DragHandleButtonProps {
  id: string;
}

export function DragHandleButton({ id }: DragHandleButtonProps) {
  const { attributes, listeners } = useSortable({ id });

  return (
    <button
      {...attributes}
      {...listeners}
      className="text-gray-300 cursor-grab hover:text-gray-400 active:cursor-grabbing touch-none"
    >
      <DragHandle />
    </button>
  );
}
