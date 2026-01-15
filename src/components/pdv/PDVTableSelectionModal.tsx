import { useState } from "react";
import { Users, Coffee, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Table } from "@/hooks/usePDVData";

interface PDVTableSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: Table[];
  onSelectTable: (table: Table | null) => void; // null = balcão
  customerName: string;
  onCustomerNameChange: (name: string) => void;
}

export function PDVTableSelectionModal({
  isOpen,
  onClose,
  tables,
  onSelectTable,
  customerName,
  onCustomerNameChange,
}: PDVTableSelectionModalProps) {
  const [selectedOption, setSelectedOption] = useState<"counter" | string>("counter");

  const handleConfirm = () => {
    if (selectedOption === "counter") {
      onSelectTable(null);
    } else {
      const table = tables.find(t => t.id === selectedOption);
      if (table) {
        onSelectTable(table);
      }
    }
    onClose();
  };

  const availableTables = tables.filter(t => t.status === "available");
  const occupiedTables = tables.filter(t => t.status === "occupied");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Destino do Pedido
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer Name */}
          <div>
            <Label htmlFor="customer-name">Nome do Cliente</Label>
            <Input
              id="customer-name"
              value={customerName}
              onChange={(e) => onCustomerNameChange(e.target.value)}
              placeholder="Digite o nome do cliente"
              className="mt-1"
            />
          </div>

          {/* Counter Option */}
          <button
            onClick={() => setSelectedOption("counter")}
            className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
              selectedOption === "counter"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              selectedOption === "counter" ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}>
              <Coffee className="w-5 h-5" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium">Balcão / Viagem</p>
              <p className="text-xs text-muted-foreground">Pedido sem mesa vinculada</p>
            </div>
            {selectedOption === "counter" && (
              <Check className="w-5 h-5 text-primary" />
            )}
          </button>

          {/* Tables */}
          {tables.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Ou selecione uma mesa
              </Label>
              <ScrollArea className="h-48">
                <div className="space-y-2 pr-2">
                  {/* Available Tables First */}
                  {availableTables.map(table => (
                    <button
                      key={table.id}
                      onClick={() => setSelectedOption(table.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                        selectedOption === table.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        selectedOption === table.id ? "bg-primary text-primary-foreground" : "bg-emerald-100 text-emerald-600"
                      }`}>
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium">Mesa {table.number}</p>
                        {table.name && (
                          <p className="text-xs text-muted-foreground">{table.name}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                        Livre
                      </Badge>
                      {selectedOption === table.id && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  ))}

                  {/* Occupied Tables */}
                  {occupiedTables.map(table => (
                    <button
                      key={table.id}
                      onClick={() => setSelectedOption(table.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                        selectedOption === table.id
                          ? "border-primary bg-primary/5"
                          : "border-amber-200 bg-amber-50/50 hover:border-primary/50"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        selectedOption === table.id ? "bg-primary text-primary-foreground" : "bg-amber-100 text-amber-600"
                      }`}>
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium">Mesa {table.number}</p>
                        {table.name && (
                          <p className="text-xs text-muted-foreground">{table.name}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-amber-600 border-amber-300">
                        Ocupada
                      </Badge>
                      {selectedOption === table.id && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Continuar para Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
