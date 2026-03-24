"use client";

import { createContext, useContext, useMemo } from "react";
import { useTenantWorkspace } from "@/modules/workspace";

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

export function ProducerUppProvider({ children }: { children: React.ReactNode }) {
  const workspace = useTenantWorkspace();

  const upps = useMemo<ProducerUpp[]>(
    () =>
      workspace.projects.map((project) => ({
        id: project.id,
        name: project.name,
        upp_code: project.code,
        status: project.status,
        herd_limit: project.herdLimit ?? null,
        hectares_total: project.hectaresTotal ?? null,
        address_text: project.addressText ?? null,
      })),
    [workspace.projects]
  );

  const selectedUppId = workspace.currentProject?.id ?? workspace.selectedProjectId;
  const selectedUpp = useMemo(
    () => upps.find((upp) => upp.id === selectedUppId) ?? null,
    [selectedUppId, upps]
  );

  const value = useMemo<ProducerUppContextValue>(
    () => ({
      tenantId: workspace.organization?.id ?? null,
      upps,
      selectedUppId,
      selectedUpp,
      hydrated: !workspace.loading,
      setSelectedUppId: workspace.setSelectedProjectId,
      clearSelectedUpp: workspace.clearSelectedProject,
    }),
    [
      selectedUpp,
      selectedUppId,
      upps,
      workspace.clearSelectedProject,
      workspace.loading,
      workspace.organization?.id,
      workspace.setSelectedProjectId,
    ]
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
