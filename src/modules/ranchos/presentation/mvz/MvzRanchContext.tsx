"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getAccessToken } from "@/shared/lib/auth-session";

interface MvzRanchContextValue {
  tenantId: string | null;
  selectedUppId: string | null;
  hydrated: boolean;
  setSelectedUppId: (uppId: string | null) => void;
}

const MvzRanchContext = createContext<MvzRanchContextValue | null>(null);

function buildStorageKey(tenantId: string) {
  return `mvz:selectedUppId:${tenantId}`;
}

export function MvzRanchProvider({ children }: { children: React.ReactNode }) {
  const [tenantId, setTenantId] = useState<string | null>(null);
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
        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        });

        const body = await response.json();
        if (!response.ok || !body.ok || body.data?.panelType !== "mvz") {
          setHydrated(true);
          return;
        }

        const resolvedTenantId = (body.data?.tenant?.id as string | undefined) ?? null;
        setTenantId(resolvedTenantId);

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
      if (!tenantId) {
        return;
      }

      const key = buildStorageKey(tenantId);
      if (uppId) {
        sessionStorage.setItem(key, uppId);
      } else {
        sessionStorage.removeItem(key);
      }
    },
    [tenantId]
  );

  const value = useMemo<MvzRanchContextValue>(
    () => ({
      tenantId,
      selectedUppId,
      hydrated,
      setSelectedUppId,
    }),
    [hydrated, selectedUppId, setSelectedUppId, tenantId]
  );

  return <MvzRanchContext.Provider value={value}>{children}</MvzRanchContext.Provider>;
}

export function useMvzRanchContext(): MvzRanchContextValue {
  const context = useContext(MvzRanchContext);
  if (!context) {
    throw new Error("useMvzRanchContext must be used within MvzRanchProvider");
  }

  return context;
}
