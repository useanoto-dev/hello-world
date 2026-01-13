import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, X } from "lucide-react";

export interface TimeSlot {
  open: number;
  close: number;
}

export interface DaySchedule {
  is_open: boolean;
  slots: TimeSlot[];
}

export interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export const DEFAULT_SCHEDULE: WeeklySchedule = {
  monday: { is_open: true, slots: [{ open: 8, close: 22 }] },
  tuesday: { is_open: true, slots: [{ open: 8, close: 22 }] },
  wednesday: { is_open: true, slots: [{ open: 8, close: 22 }] },
  thursday: { is_open: true, slots: [{ open: 8, close: 22 }] },
  friday: { is_open: true, slots: [{ open: 8, close: 22 }] },
  saturday: { is_open: true, slots: [{ open: 8, close: 22 }] },
  sunday: { is_open: true, slots: [{ open: 8, close: 22 }] },
};

const DAY_NAMES: Record<keyof WeeklySchedule, string> = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo",
};

const DAY_SHORT_NAMES: Record<keyof WeeklySchedule, string> = {
  monday: "Seg",
  tuesday: "Ter",
  wednesday: "Qua",
  thursday: "Qui",
  friday: "Sex",
  saturday: "Sáb",
  sunday: "Dom",
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface WeeklyScheduleEditorProps {
  schedule: WeeklySchedule;
  onChange: (schedule: WeeklySchedule) => void;
}

export default function WeeklyScheduleEditor({ schedule, onChange }: WeeklyScheduleEditorProps) {
  const updateDayOpen = (day: keyof WeeklySchedule, is_open: boolean) => {
    onChange({
      ...schedule,
      [day]: { 
        ...schedule[day], 
        is_open,
        slots: schedule[day].slots.length === 0 ? [{ open: 8, close: 22 }] : schedule[day].slots
      },
    });
  };

  const updateSlot = (day: keyof WeeklySchedule, slotIndex: number, updates: Partial<TimeSlot>) => {
    const newSlots = [...schedule[day].slots];
    newSlots[slotIndex] = { ...newSlots[slotIndex], ...updates };
    onChange({
      ...schedule,
      [day]: { ...schedule[day], slots: newSlots },
    });
  };

  const addSlot = (day: keyof WeeklySchedule) => {
    const lastSlot = schedule[day].slots[schedule[day].slots.length - 1];
    const newOpen = lastSlot ? Math.min(lastSlot.close + 2, 23) : 18;
    const newClose = Math.min(newOpen + 4, 24);
    
    onChange({
      ...schedule,
      [day]: { 
        ...schedule[day], 
        slots: [...schedule[day].slots, { open: newOpen, close: newClose }] 
      },
    });
  };

  const removeSlot = (day: keyof WeeklySchedule, slotIndex: number) => {
    const newSlots = schedule[day].slots.filter((_, i) => i !== slotIndex);
    onChange({
      ...schedule,
      [day]: { 
        ...schedule[day], 
        slots: newSlots.length === 0 ? [{ open: 8, close: 22 }] : newSlots 
      },
    });
  };

  const copyToAllDays = (sourceDay: keyof WeeklySchedule) => {
    const source = schedule[sourceDay];
    const newSchedule: WeeklySchedule = {} as WeeklySchedule;
    
    (Object.keys(schedule) as Array<keyof WeeklySchedule>).forEach((day) => {
      newSchedule[day] = { 
        is_open: source.is_open, 
        slots: source.slots.map(s => ({ ...s })) 
      };
    });
    
    onChange(newSchedule);
  };

  const copyToWeekdays = (sourceDay: keyof WeeklySchedule) => {
    const source = schedule[sourceDay];
    const weekdays: Array<keyof WeeklySchedule> = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    
    const newSchedule = { ...schedule };
    weekdays.forEach((day) => {
      newSchedule[day] = { 
        is_open: source.is_open, 
        slots: source.slots.map(s => ({ ...s })) 
      };
    });
    
    onChange(newSchedule);
  };

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm font-medium flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          Horários por Dia
        </CardTitle>
        <CardDescription className="text-[10px]">
          Configure horários diferentes para cada dia
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="space-y-1.5">
          {(Object.keys(DAY_NAMES) as Array<keyof WeeklySchedule>).map((day) => {
            const daySchedule = schedule[day];
            
            return (
              <div
                key={day}
                className={`flex flex-col gap-1.5 p-2 rounded-md border transition-colors ${
                  daySchedule.is_open 
                    ? 'bg-success/5 border-success/20' 
                    : 'bg-muted/30 border-border/50'
                }`}
              >
                {/* Day Name & Toggle Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={daySchedule.is_open}
                      onCheckedChange={(checked) => updateDayOpen(day, checked)}
                      className="scale-75"
                    />
                    <span className="font-medium text-[11px]">{DAY_SHORT_NAMES[day]}</span>
                  </div>

                  {/* Quick copy buttons (only on first day) */}
                  {day === 'monday' && daySchedule.is_open && (
                    <div className="hidden md:flex gap-1">
                      <button
                        type="button"
                        onClick={() => copyToWeekdays('monday')}
                        className="text-[9px] text-primary hover:text-primary/80 underline"
                      >
                        Dias úteis
                      </button>
                      <span className="text-muted-foreground text-[9px]">|</span>
                      <button
                        type="button"
                        onClick={() => copyToAllDays('monday')}
                        className="text-[9px] text-primary hover:text-primary/80 underline"
                      >
                        Todos
                      </button>
                    </div>
                  )}
                </div>

                {/* Time Slots */}
                {daySchedule.is_open ? (
                  <div className="space-y-1 pl-6">
                    {daySchedule.slots.map((slot, slotIndex) => (
                      <div key={slotIndex} className="flex items-center gap-1.5 flex-wrap">
                        {daySchedule.slots.length > 1 && (
                          <span className="text-[9px] text-muted-foreground w-10">
                            T{slotIndex + 1}
                          </span>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <Select
                            value={String(slot.open)}
                            onValueChange={(value) => updateSlot(day, slotIndex, { open: parseInt(value) })}
                          >
                            <SelectTrigger className="w-[60px] h-6 text-[10px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {HOURS.map((hour) => (
                                <SelectItem key={hour} value={String(hour)} className="text-[10px]">
                                  {String(hour).padStart(2, "0")}:00
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <span className="text-muted-foreground text-[10px]">às</span>

                          <Select
                            value={String(slot.close)}
                            onValueChange={(value) => updateSlot(day, slotIndex, { close: parseInt(value) })}
                          >
                            <SelectTrigger className="w-[60px] h-6 text-[10px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {HOURS.map((hour) => (
                                <SelectItem key={hour} value={String(hour)} className="text-[10px]">
                                  {String(hour).padStart(2, "0")}:00
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {daySchedule.slots.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-destructive hover:text-destructive/80"
                            onClick={() => removeSlot(day, slotIndex)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ))}

                    {/* Add Slot Button */}
                    {daySchedule.slots.length < 3 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-5 text-[9px] text-primary hover:text-primary/80 p-0"
                        onClick={() => addSlot(day)}
                      >
                        <Plus className="w-2.5 h-2.5 mr-0.5" />
                        + turno
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-[10px] text-muted-foreground italic pl-6">
                    Fechado
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile Quick Actions */}
        <div className="mt-2 flex flex-wrap gap-2 md:hidden">
          <button
            type="button"
            onClick={() => copyToWeekdays('monday')}
            className="text-[9px] text-primary hover:text-primary/80 underline"
          >
            Copiar seg → dias úteis
          </button>
          <button
            type="button"
            onClick={() => copyToAllDays('monday')}
            className="text-[9px] text-primary hover:text-primary/80 underline"
          >
            Copiar seg → todos
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
