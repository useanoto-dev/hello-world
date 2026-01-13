import { useState, useEffect } from "react";
import { AlertCircle, ChevronDown, X, Plus, Clock, Trash2, Check } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface NewCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CategoryFormData, createItems?: boolean) => void;
  editingCategory?: {
    id: string;
    name: string;
    description?: string | null;
    is_active?: boolean;
  } | null;
}

interface ScheduleItem {
  id: string;
  days: string[];
  startTime: string;
  endTime: string;
}

export interface CategoryFormData {
  modelo: string;
  name: string;
  isPromotion: boolean;
  promotionMessage: string;
  availability: "always" | "paused" | "scheduled";
  schedules: ScheduleItem[];
  channels: {
    all: boolean;
    pdv: boolean;
    cardapioDigital: boolean;
  };
}

const DAYS = [
  { key: "D", label: "Domingo" },
  { key: "S", label: "Segunda" },
  { key: "T", label: "Terça" },
  { key: "Q", label: "Quarta" },
  { key: "Q2", label: "Quinta" },
  { key: "S2", label: "Sexta" },
  { key: "S3", label: "Sábado" },
];

const PIZZA_STEPS = [
  { id: 1, label: "Categoria" },
  { id: 2, label: "Tamanhos" },
  { id: 3, label: "Bordas" },
  { id: 4, label: "Massas" },
  { id: 5, label: "Adicionais" },
];

export function NewCategoryModal({
  open,
  onOpenChange,
  onSave,
  editingCategory,
}: NewCategoryModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CategoryFormData>({
    modelo: "itens_principais",
    name: editingCategory?.name || "",
    isPromotion: false,
    promotionMessage: "",
    availability: "always",
    schedules: [{ id: "1", days: [], startTime: "00:00", endTime: "23:59" }],
    channels: {
      all: true,
      pdv: true,
      cardapioDigital: true,
    },
  });

  // Reset step when model changes
  useEffect(() => {
    setCurrentStep(1);
  }, [formData.modelo]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
      setFormData({
        modelo: "itens_principais",
        name: editingCategory?.name || "",
        isPromotion: false,
        promotionMessage: "",
        availability: "always",
        schedules: [{ id: "1", days: [], startTime: "00:00", endTime: "23:59" }],
        channels: {
          all: true,
          pdv: true,
          cardapioDigital: true,
        },
      });
    }
  }, [open, editingCategory]);

  const handleChannelChange = (channel: keyof typeof formData.channels, checked: boolean) => {
    if (channel === "all") {
      setFormData({
        ...formData,
        channels: {
          all: checked,
          pdv: checked,
          cardapioDigital: checked,
        },
      });
    } else {
      const newChannels = { ...formData.channels, [channel]: checked };
      const allChecked = newChannels.pdv && newChannels.cardapioDigital;
      setFormData({
        ...formData,
        channels: { ...newChannels, all: allChecked },
      });
    }
  };

  const toggleDay = (scheduleId: string, dayKey: string) => {
    setFormData({
      ...formData,
      schedules: formData.schedules.map(schedule => {
        if (schedule.id === scheduleId) {
          const newDays = schedule.days.includes(dayKey)
            ? schedule.days.filter(d => d !== dayKey)
            : [...schedule.days, dayKey];
          return { ...schedule, days: newDays };
        }
        return schedule;
      }),
    });
  };

  const updateScheduleTime = (scheduleId: string, field: "startTime" | "endTime", value: string) => {
    setFormData({
      ...formData,
      schedules: formData.schedules.map(schedule => 
        schedule.id === scheduleId ? { ...schedule, [field]: value } : schedule
      ),
    });
  };

  const addSchedule = () => {
    setFormData({
      ...formData,
      schedules: [
        ...formData.schedules,
        { id: Date.now().toString(), days: [], startTime: "00:00", endTime: "23:59" },
      ],
    });
  };

  const removeSchedule = (scheduleId: string) => {
    if (formData.schedules.length > 1) {
      setFormData({
        ...formData,
        schedules: formData.schedules.filter(s => s.id !== scheduleId),
      });
    }
  };

  const handleSave = (createItems: boolean = false) => {
    if (!formData.name.trim()) return;
    onSave(formData, createItems);
  };

  const isPizza = formData.modelo === "pizza";

  // Category Form Content - shared between both modes
  const CategoryFormContent = () => (
    <div className="space-y-6">
      {/* Alert Banner */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted rounded-lg border">
        <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        <span className="text-sm">
          <span className="font-medium">Atenção!</span>{" "}
          <span className="text-destructive">Existem campos obrigatórios nesta sessão.</span>
        </span>
        <button 
          onClick={() => onOpenChange(false)}
          className="ml-auto text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Modelo + Nome da categoria - inline */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="space-y-2 w-full sm:w-32">
          <Label className="text-sm font-medium">
            Modelo <span className="text-destructive">*</span>
          </Label>
          <Select value={formData.modelo} onValueChange={(v) => setFormData({ ...formData, modelo: v })}>
            <SelectTrigger className="w-full border-input focus:ring-primary">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent className="bg-popover border shadow-lg z-50">
              <SelectItem value="itens_principais">Padrão</SelectItem>
              <SelectItem value="pizza">Pizza</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 flex-1">
          <Label className="text-sm font-medium">
            Nome da categoria <span className="text-destructive">*</span>
          </Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={isPizza ? "Ex.: Pizzas Salgadas" : "Ex.: Bebidas"}
            className="border-input focus:border-primary"
          />
        </div>
      </div>

      {/* Promoção */}
      <div className="flex items-start gap-4">
        <div className="flex items-center gap-3">
          <Switch
            checked={formData.isPromotion}
            onCheckedChange={(checked) => setFormData({ ...formData, isPromotion: checked })}
            className="data-[state=checked]:bg-primary"
          />
          <Label className="text-sm font-medium">Promoção</Label>
        </div>
        {formData.isPromotion && (
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">Mensagem promocional</Label>
            <Input
              value={formData.promotionMessage}
              onChange={(e) => setFormData({ ...formData, promotionMessage: e.target.value.slice(0, 8) })}
              placeholder="Ex.: 10% OFF"
              maxLength={8}
              className="border-input"
            />
            <p className="text-xs text-muted-foreground text-right">{formData.promotionMessage.length}/8</p>
          </div>
        )}
      </div>

      {/* Disponibilidade */}
      <div className="space-y-4">
        <Label className="text-sm font-semibold">Disponibilidade</Label>
        
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div 
              className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors",
                formData.availability === "always" 
                  ? "border-primary bg-primary" 
                  : "border-muted-foreground"
              )}
              onClick={() => setFormData({ ...formData, availability: "always" })}
            >
              {formData.availability === "always" && (
                <div className="w-2 h-2 rounded-full bg-primary-foreground" />
              )}
            </div>
            <div className="flex-1" onClick={() => setFormData({ ...formData, availability: "always" })}>
              <p className="font-medium text-sm text-foreground">Sempre disponível</p>
              <p className="text-xs text-primary">
                O item ficará disponível sempre que o estabelecimento estiver aberto em todos os canais de venda
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <div 
              className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors",
                formData.availability === "paused" 
                  ? "border-primary bg-primary" 
                  : "border-muted-foreground"
              )}
              onClick={() => setFormData({ ...formData, availability: "paused" })}
            >
              {formData.availability === "paused" && (
                <div className="w-2 h-2 rounded-full bg-primary-foreground" />
              )}
            </div>
            <div className="flex-1" onClick={() => setFormData({ ...formData, availability: "paused" })}>
              <p className="font-medium text-sm text-destructive">Pausado e não disponível no cardápio</p>
              <p className="text-xs text-muted-foreground">
                Não aparecerá nos seus canais de venda
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <div 
              className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors",
                formData.availability === "scheduled" 
                  ? "border-primary bg-primary" 
                  : "border-muted-foreground"
              )}
              onClick={() => setFormData({ ...formData, availability: "scheduled" })}
            >
              {formData.availability === "scheduled" && (
                <div className="w-2 h-2 rounded-full bg-primary-foreground" />
              )}
            </div>
            <div className="flex-1" onClick={() => setFormData({ ...formData, availability: "scheduled" })}>
              <p className="font-medium text-sm text-foreground">Disponível em dias e horários específicos</p>
              <p className="text-xs text-muted-foreground">
                Escolha quando o item aparece nos seus canais de venda
              </p>
            </div>
          </label>
        </div>

        {/* Schedule Picker */}
        {formData.availability === "scheduled" && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4">
            {formData.schedules.map((schedule, index) => (
              <div key={schedule.id} className="space-y-3">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Dias disponíveis</Label>
                    <div className="flex gap-1">
                      {DAYS.map((day) => (
                        <button
                          key={day.key}
                          type="button"
                          onClick={() => toggleDay(schedule.id, day.key)}
                          className={cn(
                            "w-8 h-8 rounded-full text-xs font-medium transition-colors",
                            schedule.days.includes(day.key)
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted-foreground/20 text-muted-foreground hover:bg-muted-foreground/30"
                          )}
                          title={day.label}
                        >
                          {day.key.charAt(0)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Horários</Label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 border rounded px-2 py-1 bg-background">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <Input
                          type="time"
                          value={schedule.startTime}
                          onChange={(e) => updateScheduleTime(schedule.id, "startTime", e.target.value)}
                          className="border-0 p-0 h-auto w-20 text-sm"
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">às</span>
                      <div className="flex items-center gap-1 border rounded px-2 py-1 bg-background">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <Input
                          type="time"
                          value={schedule.endTime}
                          onChange={(e) => updateScheduleTime(schedule.id, "endTime", e.target.value)}
                          className="border-0 p-0 h-auto w-20 text-sm"
                        />
                      </div>
                      {formData.schedules.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSchedule(schedule.id)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                {index < formData.schedules.length - 1 && (
                  <div className="border-t" />
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addSchedule}
              className="flex items-center gap-2 text-primary hover:text-primary/80 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Horário
            </button>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Os canais de venda são: PDV e Cardápio Digital
        </p>
      </div>

      {/* Exibição por canais de venda */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-semibold">Exibição por canais de venda</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Selecione em quais locais deseja que essa categoria fique visível para os seus clientes.
          </p>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={formData.channels.all}
              onCheckedChange={(checked) => handleChannelChange("all", !!checked)}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <span className="text-sm font-medium">Exibir em todos</span>
          </label>

          <div className="ml-6 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={formData.channels.pdv}
                onCheckedChange={(checked) => handleChannelChange("pdv", !!checked)}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <span className="text-sm">Exibir no PDV</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={formData.channels.cardapioDigital}
                onCheckedChange={(checked) => handleChannelChange("cardapioDigital", !!checked)}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <span className="text-sm">Exibir no Cardápio Digital</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  // Pizza mode - with sidebar steps
  if (isPizza) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="w-full h-full max-w-full max-h-full sm:max-w-full sm:max-h-full sm:rounded-none overflow-hidden p-0 bg-muted/30"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {/* Header */}
          <div className="bg-background border-b px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-foreground">Gestor de cardápio</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Início » Gestor de cardápio » Categoria
                </p>
              </div>
              <button 
                onClick={() => onOpenChange(false)}
                className="text-muted-foreground hover:text-foreground p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar - Steps */}
            <div className="hidden md:block w-56 lg:w-64 bg-background border-r p-4 lg:p-6">
              <nav className="space-y-1">
                {PIZZA_STEPS.map((step) => (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(step.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                      currentStep === step.id
                        ? "bg-primary/10 text-primary border-l-4 border-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span className={cn(
                      "flex items-center justify-center w-6 h-6 rounded-full text-xs",
                      currentStep === step.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted-foreground/20"
                    )}>
                      {step.id}
                    </span>
                    {step.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Mobile Steps - Horizontal */}
            <div className="md:hidden fixed bottom-20 left-0 right-0 bg-background border-t px-4 py-3 z-10">
              <div className="flex justify-between">
                {PIZZA_STEPS.map((step) => (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(step.id)}
                    className={cn(
                      "flex flex-col items-center gap-1",
                      currentStep === step.id
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    <span className={cn(
                      "flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium",
                      currentStep === step.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted-foreground/20"
                    )}>
                      {step.id}
                    </span>
                    <span className="text-[10px]">{step.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto pb-32 md:pb-0">
              <div className="max-w-2xl mx-auto p-4 sm:p-6">
                {/* Step Title */}
                <div className="bg-background rounded-lg shadow-sm border p-4 sm:p-6">
                  <h2 className="text-lg font-semibold mb-4">
                    {currentStep}. {PIZZA_STEPS.find(s => s.id === currentStep)?.label}
                  </h2>

                  {currentStep === 1 && <CategoryFormContent />}
                  
                  {currentStep === 2 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>Configuração de tamanhos será implementada em breve.</p>
                    </div>
                  )}
                  
                  {currentStep === 3 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>Configuração de bordas será implementada em breve.</p>
                    </div>
                  )}
                  
                  {currentStep === 4 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>Configuração de massas será implementada em breve.</p>
                    </div>
                  )}
                  
                  {currentStep === 5 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>Configuração de adicionais será implementada em breve.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-background border-t px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between max-w-2xl mx-auto gap-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11"
              >
                Cancelar
              </Button>
              
              <div className="flex gap-2">
                {currentStep > 1 && (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    className="h-11"
                  >
                    Voltar
                  </Button>
                )}
                
                {currentStep < 5 ? (
                  <Button 
                    onClick={() => setCurrentStep(prev => prev + 1)}
                    className="h-11 bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={currentStep === 1 && !formData.name.trim()}
                  >
                    Próximo
                  </Button>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        className="h-11 bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                        disabled={!formData.name.trim()}
                      >
                        Salvar
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-popover border shadow-lg z-50">
                      <DropdownMenuItem onClick={() => handleSave(true)}>
                        Salvar e criar itens
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSave(false)}>
                        Salvar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Standard mode - simple fullscreen form
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-full h-full max-w-full max-h-full sm:max-w-full sm:max-h-full sm:rounded-none overflow-hidden p-0 bg-muted/30"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="bg-background border-b px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-foreground">
                {editingCategory ? "Editar categoria" : "Adicionar nova categoria"}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Início » Gestor de cardápio » Categoria
              </p>
            </div>
            <button 
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground p-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto p-4 sm:p-6">
            <div className="bg-background rounded-lg shadow-sm border p-4 sm:p-6">
              <h2 className="text-lg font-semibold mb-4">1. Categoria</h2>
              <CategoryFormContent />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-background border-t px-4 sm:px-6 py-4">
          <div className="flex items-center justify-end max-w-2xl mx-auto gap-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11"
            >
              Cancelar
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  className="h-11 bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                  disabled={!formData.name.trim()}
                >
                  Salvar
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover border shadow-lg z-50">
                <DropdownMenuItem onClick={() => handleSave(true)}>
                  Salvar e criar itens
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSave(false)}>
                  Salvar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
