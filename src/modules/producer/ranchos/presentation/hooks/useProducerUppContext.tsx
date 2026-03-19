"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getAccessToken } from "@/shared/lib/auth-session";
import {
  logProducerAccessClient,
  sampleProducerAccessClientIds,
} from "@/modules/producer/ranchos/presentation/producerAccessDebug";

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
      logProducerAccessClient("useProducerUppContext:bootstrap-start");
      const accessToken = await getAccessToken();
      if (!accessToken) {
        logProducerAccessClient("useProducerUppContext:no-access-token");
        setHydrated(true);
        return;
      }

      try {
        const meResponse = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });
        const meBody = await meResponse.json();

        logProducerAccessClient("useProducerUppContext:auth-me-response", {
          status: meResponse.status,
          ok: meBody.ok === true,
          panelType: meBody.data?.panelType ?? null,
          tenantId: meBody.data?.tenant?.id ?? null,
          tenantSlug: meBody.data?.tenant?.slug ?? null,
          permissionCount: Array.isArray(meBody.data?.permissions) ? meBody.data.permissions.length : 0,
          errorCode: meBody.error?.code ?? null,
        });

        if (!meResponse.ok || !meBody.ok || meBody.data?.panelType !== "producer") {
          logProducerAccessClient("useProducerUppContext:auth-me-skipped", {
            status: meResponse.status,
            ok: meBody.ok === true,
            panelType: meBody.data?.panelType ?? null,
          });
          setHydrated(true);
          return;
        }

        const resolvedTenantId = (meBody.data?.tenant?.id as string | undefined) ?? null;
        setTenantId(resolvedTenantId);
        logProducerAccessClient("useProducerUppContext:tenant-resolved", {
          tenantId: resolvedTenantId,
          tenantSlug: meBody.data?.tenant?.slug ?? null,
          panelType: meBody.data?.panelType ?? null,
        });

        const uppsResponse = await fetch("/api/producer/upp", {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });
        const uppsBody = await uppsResponse.json();
        const nextUpps = uppsBody.data?.upps ?? [];
        logProducerAccessClient("useProducerUppContext:producer-upp-response", {
          status: uppsResponse.status,
          ok: uppsBody.ok === true,
          upps: sampleProducerAccessClientIds(
            nextUpps.map((upp: ProducerUpp) => upp.id)
          ),
          errorCode: uppsBody.error?.code ?? null,
        });
        if (uppsResponse.ok && uppsBody.ok) {
          setUpps(nextUpps);
        }

        if (resolvedTenantId) {
          const stored = sessionStorage.getItem(buildStorageKey(resolvedTenantId));
          if (stored) {
            setSelectedUppIdState(stored);
          }
          logProducerAccessClient("useProducerUppContext:restore-selection", {
            tenantId: resolvedTenantId,
            storedSelectedUppId: stored,
          });
        }
      } catch (error) {
        logProducerAccessClient("useProducerUppContext:bootstrap-error", {
          error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
        });
        // Ignore and keep provider in neutral mode.
      } finally {
        setHydrated(true);
        logProducerAccessClient("useProducerUppContext:bootstrap-end");
      }
    };

    void run();
  }, []);

  const setSelectedUppId = useCallback(
    (uppId: string | null) => {
      setSelectedUppIdState(uppId);
      logProducerAccessClient("useProducerUppContext:set-selected-upp", {
        tenantId,
        selectedUppId: uppId,
      });
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
    logProducerAccessClient("useProducerUppContext:clear-selected-upp", {
      tenantId,
    });
    setSelectedUppId(null);
  }, [setSelectedUppId, tenantId]);

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
