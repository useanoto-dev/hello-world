import { UtensilsCrossed, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ServiceType } from "@/contexts/CartContext";

interface FSWConsumptionMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (method: ServiceType) => void;
}

const FSWConsumptionMethodDialog = ({
  open,
  onOpenChange,
  onSelect,
}: FSWConsumptionMethodDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-gray-900">
            Como você quer consumir?
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button
            variant="outline"
            className="h-20 flex items-center justify-start gap-4 px-6 rounded-xl border-2 hover:border-primary hover:bg-primary/5 transition-all"
            onClick={() => onSelect("dine_in")}
          >
            <UtensilsCrossed className="w-8 h-8 text-primary" />
            <span className="text-lg font-semibold text-gray-800">Comer no local</span>
          </Button>
          
          <Button
            variant="outline"
            className="h-20 flex items-center justify-start gap-4 px-6 rounded-xl border-2 hover:border-primary hover:bg-primary/5 transition-all"
            onClick={() => onSelect("pickup")}
          >
            <ShoppingBag className="w-8 h-8 text-primary" />
            <span className="text-lg font-semibold text-gray-800">Para viagem</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FSWConsumptionMethodDialog;
