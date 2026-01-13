import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FlowNodeData {
  label: string;
  description: string;
  icon: string;
  imageUrl?: string;
  isEnabled: boolean;
  isFixed: boolean;
  isDeletable?: boolean;
  onToggle: (enabled: boolean) => void;
  onDelete?: () => void;
}

interface FlowNodeProps {
  data: FlowNodeData;
  selected?: boolean;
}

function FlowNodeComponent({ data, selected }: FlowNodeProps) {
  return (
    <div
      className={cn(
        "relative px-5 py-4 rounded-xl border-2 min-w-[200px] transition-all duration-200 cursor-grab active:cursor-grabbing",
        data.isEnabled 
          ? "bg-card border-primary shadow-lg shadow-primary/20" 
          : "bg-muted/50 border-muted-foreground/30 opacity-60",
        selected && "ring-2 ring-ring ring-offset-2 ring-offset-background",
        data.isFixed && "border-dashed"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className={cn(
          "!w-4 !h-4 !border-2 !border-background !-left-2 transition-colors",
          data.isEnabled ? "!bg-primary hover:!bg-primary/80" : "!bg-muted-foreground/50"
        )}
      />
      
      <div className="flex items-center gap-3">
        {data.imageUrl ? (
          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
            <img src={data.imageUrl} alt={data.label} className="w-full h-full object-cover" />
          </div>
        ) : (
          <span className="text-3xl">{data.icon}</span>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{data.label}</p>
          <p className="text-xs text-muted-foreground truncate">{data.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {!data.isFixed && (
            <Switch
              checked={data.isEnabled}
              onCheckedChange={data.onToggle}
              className="data-[state=checked]:bg-primary"
            />
          )}
          {data.isDeletable && data.onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                data.onDelete?.();
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      
      {data.isFixed && (
        <span className="absolute -top-2.5 -right-2 text-[10px] font-medium bg-primary text-primary-foreground px-2 py-0.5 rounded-full shadow">
          Fixo
        </span>
      )}
      
      <Handle
        type="source"
        position={Position.Right}
        className={cn(
          "!w-4 !h-4 !border-2 !border-background !-right-2 transition-colors",
          data.isEnabled ? "!bg-primary hover:!bg-primary/80" : "!bg-muted-foreground/50"
        )}
      />
    </div>
  );
}

const FlowNode = memo(FlowNodeComponent);
FlowNode.displayName = 'FlowNode';

export default FlowNode;
