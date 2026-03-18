"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getAccessToken } from "@/shared/lib/auth-session";

export interface ProducerUpp {
  id: string;
  name: string;
  upp_code: string | null;
  status: string;
  herd_limit: number | null;
  hectares_total: number | null;
  address_text: string | null;
}

interface ProducerUppContextValue {
  tenantId: string | null;
  upps: ProducerUpp[];
  selectedUppId: string | null;
  selectedUpp: ProducerUpp | null;
  hydrated: boolean;
  setSelectedUppId: (uppId: string | null) => void;
  clearSelectedUpp: () => void;
}

const ProducerUppContext = createContext<ProducerUppContextValue | null>(null);

function buildStorageKey(tenantId: string) {
  return `producer:selectedUppId:${tenantId}`;
}

export function ProducerUppProvider({ children }: { children: React.ReactNode }) {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [upps, setUpps] = useState<ProducerUpp[]>([]);
  const [selectedUppId, setSelectedUppIdState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const run = async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setHydrated(true);
        return;
      }

      try {
        const meResponse = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });
        const meBody = await meResponse.json();

        if (!meResponse.ok || !meBody.ok || meBody.data?.panelType !== "producer") {
          setHydrated(true);
          return;
        }

        const resolvedTenantId = (meBody.data?.tenant?.id as string | undefined) ?? null;
        setTenantId(resolvedTenantId);

        const uppsResponse = await fetch("/api/producer/upp", {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });
        const uppsBody = await uppsResponse.json();
        if (uppsResponse.ok && uppsBody.ok) {
          setUpps(uppsBody.data?.upps ?? []);
        }

        if (resolvedTenantId) {
          const stored = sessionStorage.getItem(buildStorageKey(resolvedTenantId));
          if (stored) {
            setSelectedUppIdState(stored);
          }
        }
      } catch {
        // Ignore and keep provider in neutral mode.
      } finally {
        setHydrated(true);
      }
    };

    void run();
  }, []);

  const setSelectedUppId = useCallback(
    (uppId: string | null) => {
      setSelectedUppIdState(uppId);
      if (!tenantId) return;
      const key = buildStorageKey(tenantId);
      if (uppId) {
        sessionStorage.setItem(key, uppId);
      } else {
        sessionStorage.removeItem(key);
      }
    },
    [tenantId]
  );

  const clearSelectedUpp = useCallback(() => {
    setSelectedUppId(null);
  }, [setSelectedUppId]);

  const selectedUpp = useMemo(
    () => upps.find((upp) => upp.id === selectedUppId) ?? null,
    [upps, selectedUppId]
  );

  const value = useMemo<ProducerUppContextValue>(
    () => ({ tenantId, upps, selectedUppId, selectedUpp, hydrated, setSelectedUppId, clearSelectedUpp }),
    [tenantId, upps, selectedUppId, selectedUpp, hydrated, setSelectedUppId, clearSelectedUpp]
  );

  return <ProducerUppContext.Provider value={value}>{children}</ProducerUppContext.Provider>;
}

export function useProducerUppContext(): ProducerUppContextValue {
  const context = useContext(ProducerUppContext);
  if (!context) {
    throw new Error("useProducerUppContext must be used within ProducerUppProvider");
  }
  return context;
}
