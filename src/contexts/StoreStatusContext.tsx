import { createContext, useContext, ReactNode, useState, useMemo, useEffect } from "react";
import { parseSchedule, isStoreOpenNow, getNextOpeningTime } from "@/lib/scheduleUtils";

interface StoreStatusContextType {
  isOpen: boolean;
  statusText: string;
  nextOpeningTime: string | null;
  setStoreData: (data: { schedule: unknown; is_open_override: boolean | null; open_hour?: number | null; close_hour?: number | null }) => void;
}

const StoreStatusContext = createContext<StoreStatusContextType | undefined>(undefined);

export function StoreStatusProvider({ children }: { children: ReactNode }) {
  const [storeData, setStoreData] = useState<{
    schedule: unknown;
    is_open_override: boolean | null;
    open_hour?: number | null;
    close_hour?: number | null;
  } | null>(null);

  const status = useMemo(() => {
    if (!storeData) {
      return { isOpen: true, statusText: "Aberto", nextOpeningTime: null };
    }

    const parsedSchedule = parseSchedule(storeData.schedule);
    const storeStatus = isStoreOpenNow(
      parsedSchedule,
      storeData.is_open_override,
      storeData.open_hour ?? undefined,
      storeData.close_hour ?? undefined
    );

    const next = storeStatus.isOpen ? null : getNextOpeningTime(parsedSchedule);

    return {
      isOpen: storeStatus.isOpen,
      statusText: storeStatus.statusText,
      nextOpeningTime: next,
    };
  }, [storeData]);

  return (
    <StoreStatusContext.Provider
      value={{
        ...status,
        setStoreData,
      }}
    >
      {children}
    </StoreStatusContext.Provider>
  );
}

export function useStoreStatus() {
  const context = useContext(StoreStatusContext);
  if (!context) {
    // Return default open state if not within provider
    return {
      isOpen: true,
      statusText: "Aberto",
      nextOpeningTime: null,
      setStoreData: () => {},
    };
  }
  return context;
}
