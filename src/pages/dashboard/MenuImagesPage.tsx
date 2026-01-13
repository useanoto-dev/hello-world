// Menu Images Page - Placeholder
import { ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function MenuImagesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-base font-semibold">Imagens do Cardápio</h1>
        <p className="text-[11px] text-muted-foreground">
          Gerencie as imagens dos produtos
        </p>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10">
          <ImageIcon className="w-10 h-10 text-muted-foreground/50 mb-3" />
          <h3 className="font-medium text-sm mb-1">Gerenciar imagens</h3>
          <p className="text-muted-foreground text-xs text-center max-w-xs">
            Em breve você poderá gerenciar todas as imagens do seu cardápio aqui.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
