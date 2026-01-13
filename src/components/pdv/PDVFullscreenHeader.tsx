import { ArrowLeft, X, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface PDVFullscreenHeaderProps {
  onExitFullscreen: () => void;
}

export function PDVFullscreenHeader({ onExitFullscreen }: PDVFullscreenHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    onExitFullscreen();
    navigate("/dashboard");
  };

  return (
    <header className="h-12 bg-background border-b flex items-center justify-between px-4 flex-shrink-0">
      {/* Left - Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBack}
        className="gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar</span>
      </Button>

      {/* Center - Title with X button */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-muted-foreground">
          PDV - Modo Tela Cheia
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onExitFullscreen}
          className="rounded-full h-8 w-8 bg-muted/50 hover:bg-muted"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Right - Exit fullscreen button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onExitFullscreen}
        className="gap-2 text-muted-foreground hover:text-foreground"
      >
        <Minimize2 className="w-4 h-4" />
        <span>Sair</span>
      </Button>
    </header>
  );
}
