import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Coffee, Clock, X } from "lucide-react";
import { Table, formatOccupationTime } from "@/hooks/usePDVData";

interface PDVTablesPanelProps {
  tables: Table[];
  selectedTable: Table | null;
  isCounter: boolean;
  onSelectTable: (table: Table) => void;
  onSelectCounter: () => void;
  onRequestReleaseTable: (table: Table, e: React.MouseEvent) => void;
}

export function PDVTablesPanel({
  tables,
  selectedTable,
  isCounter,
  onSelectTable,
  onSelectCounter,
  onRequestReleaseTable,
}: PDVTablesPanelProps) {
  return (
    <div className="w-48 flex-shrink-0 flex flex-col gap-3">
      <h2 className="font-semibold text-sm">Mesas</h2>
      
      <Button
        variant={isCounter ? "default" : "outline"}
        className="w-full justify-start gap-2"
        onClick={onSelectCounter}
      >
        <Coffee className="w-4 h-4" />
        Balcão
      </Button>
      
      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {tables.map(table => {
            const isOccupied = table.status === "occupied";
            const isSelected = selectedTable?.id === table.id;
            const occupationTime = isOccupied ? formatOccupationTime(table.updated_at) : null;
            
            return (
              <div key={table.id} className="relative group">
                <Button
                  variant={isSelected ? "default" : "outline"}
                  className={`w-full justify-start relative h-auto py-2 ${
                    isOccupied && !isSelected 
                      ? "border-amber-400 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 dark:border-amber-700" 
                      : ""
                  }`}
                  onClick={() => onSelectTable(table)}
                >
                  <div className="flex items-center w-full gap-2">
                    <Users className={`w-4 h-4 flex-shrink-0 ${isOccupied && !isSelected ? "text-amber-600" : ""}`} />
                    <div className="flex flex-col items-start flex-1 min-w-0">
                      <span className={`text-sm ${isOccupied && !isSelected ? "text-amber-800 dark:text-amber-300" : ""}`}>
                        Mesa {table.number}
                      </span>
                      {isOccupied && occupationTime && (
                        <span className={`text-[10px] flex items-center gap-1 ${
                          isSelected 
                            ? "text-primary-foreground/70" 
                            : "text-amber-600 dark:text-amber-400"
                        }`}>
                          <Clock className="w-3 h-3" />
                          {occupationTime}
                        </span>
                      )}
                    </div>
                    {isOccupied && (
                      <Badge 
                        variant="secondary" 
                        className={`text-[10px] flex-shrink-0 ${
                          isSelected 
                            ? "" 
                            : "bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200"
                        }`}
                      >
                        Ocupada
                      </Badge>
                    )}
                  </div>
                </Button>
                {isOccupied && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    onClick={(e) => onRequestReleaseTable(table, e)}
                    title="Liberar mesa"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
      
      {tables.length === 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Nenhuma mesa cadastrada
        </p>
      )}
    </div>
  );
}
