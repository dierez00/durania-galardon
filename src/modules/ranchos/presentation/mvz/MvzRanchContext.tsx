"use client";

import { createContext, useContext, useMemo } from "react";
import { useTenantWorkspace } from "@/modules/workspace";

interface MvzRanchContextValue {
  tenantId: string | null;
  selectedUppId: string | null;
  hydrated: boolean;
  setSelectedUppId: (uppId: string | null) => void;
}

const MvzRanchContext = createContext<MvzRanchContextValue | null>(null);

export function MvzRanchProvider({ children }: { children: React.ReactNode }) {
  const workspace = useTenantWorkspace();

  const value = useMemo<MvzRanchContextValue>(
    () => ({
      tenantId: workspace.organization?.id ?? null,
      selectedUppId: workspace.currentProject?.id ?? workspace.selectedProjectId,
      hydrated: !workspace.loading,
      setSelectedUppId: workspace.setSelectedProjectId,
    }),
    [
      workspace.currentProject?.id,
      workspace.loading,
      workspace.organization?.id,
      workspace.selectedProjectId,
      workspace.setSelectedProjectId,
    ]
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
