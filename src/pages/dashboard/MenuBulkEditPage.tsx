// Menu Bulk Edit Page - Placeholder
import { Edit3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function MenuBulkEditPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-base font-semibold">Edição em Massa</h1>
        <p className="text-[11px] text-muted-foreground">
          Edite múltiplos itens de uma vez
        </p>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10">
          <Edit3 className="w-10 h-10 text-muted-foreground/50 mb-3" />
          <h3 className="font-medium text-sm mb-1">Edição em massa</h3>
          <p className="text-muted-foreground text-xs text-center max-w-xs">
            Em breve você poderá editar múltiplos itens de uma vez só.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
