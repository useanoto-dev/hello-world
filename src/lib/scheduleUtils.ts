import type { WeeklySchedule, DaySchedule, TimeSlot } from "@/components/admin/WeeklyScheduleEditor";

export const DEFAULT_SCHEDULE: WeeklySchedule = {
  monday: { is_open: true, slots: [{ open: 8, close: 22 }] },
  tuesday: { is_open: true, slots: [{ open: 8, close: 22 }] },
  wednesday: { is_open: true, slots: [{ open: 8, close: 22 }] },
  thursday: { is_open: true, slots: [{ open: 8, close: 22 }] },
  friday: { is_open: true, slots: [{ open: 8, close: 22 }] },
  saturday: { is_open: true, slots: [{ open: 8, close: 22 }] },
  sunday: { is_open: true, slots: [{ open: 8, close: 22 }] },
};

const DAY_MAP: Record<number, keyof WeeklySchedule> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

const DAY_NAMES_PT: Record<keyof WeeklySchedule, string> = {
  monday: "Segunda",
  tuesday: "Terça",
  wednesday: "Quarta",
  thursday: "Quinta",
  friday: "Sexta",
  saturday: "Sábado",
  sunday: "Domingo",
};

/**
 * Parse schedule from database (JSON) to typed object
 * Supports both old format (open/close) and new format (slots array)
 */
export function parseSchedule(scheduleJson: unknown): WeeklySchedule {
  if (!scheduleJson || typeof scheduleJson !== 'object') {
    return DEFAULT_SCHEDULE;
  }
  
  const schedule = scheduleJson as Record<string, unknown>;
  const result: WeeklySchedule = { ...DEFAULT_SCHEDULE };
  
  (Object.keys(DEFAULT_SCHEDULE) as Array<keyof WeeklySchedule>).forEach((day) => {
    if (schedule[day] && typeof schedule[day] === 'object') {
      const dayData = schedule[day] as Record<string, unknown>;
      
      // Check if it's new format (with slots) or old format (open/close)
      if (Array.isArray(dayData.slots)) {
        // New format with slots
        const slots: TimeSlot[] = dayData.slots
          .filter((s): s is Record<string, unknown> => s !== null && typeof s === 'object')
          .map((s) => ({
            open: typeof s.open === 'number' ? s.open : 8,
            close: typeof s.close === 'number' ? s.close : 22,
          }));
        
        result[day] = {
          is_open: typeof dayData.is_open === 'boolean' ? dayData.is_open : true,
          slots: slots.length > 0 ? slots : [{ open: 8, close: 22 }],
        };
      } else {
        // Old format - convert to new format
        const open = typeof dayData.open === 'number' ? dayData.open : 8;
        const close = typeof dayData.close === 'number' ? dayData.close : 22;
        const is_open = typeof dayData.is_open === 'boolean' ? dayData.is_open : true;
        
        result[day] = {
          is_open,
          slots: [{ open, close }],
        };
      }
    }
  });
  
  return result;
}

/**
 * Get current day's schedule
 */
export function getTodaySchedule(schedule: WeeklySchedule): DaySchedule {
  const today = new Date().getDay();
  const dayKey = DAY_MAP[today];
  return schedule[dayKey];
}

/**
 * Check if current time is within any of the time slots
 */
function isWithinSlots(slots: TimeSlot[], currentHour: number): boolean {
  return slots.some(slot => currentHour >= slot.open && currentHour < slot.close);
}

/**
 * Check if store is currently open based on schedule
 */
export function isStoreOpenNow(
  schedule: WeeklySchedule | null, 
  isOpenOverride: boolean | null,
  fallbackOpenHour?: number,
  fallbackCloseHour?: number
): { isOpen: boolean; statusText: string } {
  // Check override first
  if (isOpenOverride === true) {
    return { isOpen: true, statusText: "Aberto agora" };
  }
  if (isOpenOverride === false) {
    return { isOpen: false, statusText: "Fechado" };
  }
  
  const now = new Date();
  const currentHour = now.getHours();
  
  // If we have a schedule, use it
  if (schedule) {
    const todaySchedule = getTodaySchedule(schedule);
    
    if (!todaySchedule.is_open) {
      return { isOpen: false, statusText: "Fechado hoje" };
    }
    
    const isOpen = isWithinSlots(todaySchedule.slots, currentHour);
    return { 
      isOpen, 
      statusText: isOpen ? "Aberto agora" : "Fechado" 
    };
  }
  
  // Fallback to simple open/close hours
  const openHour = fallbackOpenHour ?? 8;
  const closeHour = fallbackCloseHour ?? 22;
  const isOpen = currentHour >= openHour && currentHour < closeHour;
  
  return { 
    isOpen, 
    statusText: isOpen ? "Aberto agora" : "Fechado" 
  };
}

/**
 * Format time slots to display string
 */
function formatSlots(slots: TimeSlot[]): string {
  return slots
    .map(slot => `${String(slot.open).padStart(2, "0")}:00 - ${String(slot.close).padStart(2, "0")}:00`)
    .join(" / ");
}

/**
 * Get today's hours text
 */
export function getTodayHoursText(
  schedule: WeeklySchedule | null,
  fallbackOpenHour?: number,
  fallbackCloseHour?: number
): string {
  if (schedule) {
    const todaySchedule = getTodaySchedule(schedule);
    if (!todaySchedule.is_open) {
      return "Fechado hoje";
    }
    return formatSlots(todaySchedule.slots);
  }
  
  const openHour = fallbackOpenHour ?? 8;
  const closeHour = fallbackCloseHour ?? 22;
  return `${String(openHour).padStart(2, "0")}h às ${String(closeHour).padStart(2, "0")}h`;
}

/**
 * Get formatted schedule for display (all days)
 */
export function getFormattedWeekSchedule(schedule: WeeklySchedule): Array<{ 
  day: string; 
  hours: string; 
  isOpen: boolean;
  slots: TimeSlot[];
}> {
  return (Object.keys(DAY_NAMES_PT) as Array<keyof WeeklySchedule>).map((day) => {
    const daySchedule = schedule[day];
    return {
      day: DAY_NAMES_PT[day],
      hours: daySchedule.is_open 
        ? formatSlots(daySchedule.slots)
        : "Fechado",
      isOpen: daySchedule.is_open,
      slots: daySchedule.slots,
    };
  });
}

/**
 * Check if all days have the same schedule
 */
export function hasSameScheduleAllDays(schedule: WeeklySchedule): boolean {
  const days = Object.values(schedule);
  const first = days[0];
  
  return days.every((day) => {
    if (day.is_open !== first.is_open) return false;
    if (day.slots.length !== first.slots.length) return false;
    return day.slots.every((slot, i) => 
      slot.open === first.slots[i].open && slot.close === first.slots[i].close
    );
  });
}

/**
 * Get next opening time
 */
export function getNextOpeningTime(schedule: WeeklySchedule): string | null {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay();
  
  const todaySchedule = getTodaySchedule(schedule);
  
  // Check if there's a later slot today
  if (todaySchedule.is_open) {
    const nextSlot = todaySchedule.slots.find(slot => slot.open > currentHour);
    if (nextSlot) {
      return `Abre às ${String(nextSlot.open).padStart(2, "0")}:00`;
    }
  }
  
  // Check next days
  for (let i = 1; i <= 7; i++) {
    const nextDayIndex = (currentDay + i) % 7;
    const dayKey = DAY_MAP[nextDayIndex];
    const daySchedule = schedule[dayKey];
    
    if (daySchedule.is_open && daySchedule.slots.length > 0) {
      const dayName = DAY_NAMES_PT[dayKey];
      const openTime = String(daySchedule.slots[0].open).padStart(2, "0");
      
      if (i === 1) {
        return `Abre amanhã às ${openTime}:00`;
      }
      return `Abre ${dayName} às ${openTime}:00`;
    }
  }
  
  return null;
}
