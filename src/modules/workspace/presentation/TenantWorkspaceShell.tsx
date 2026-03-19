"use client";

import { Building2 } from "lucide-react";
import { TenantAppShell } from "@/shared/ui/layout/TenantAppShell";
import { useTenantWorkspace } from "@/modules/workspace/presentation/TenantWorkspaceContext";
import { buildSettingsHref } from "@/modules/workspace/presentation/workspace-routing";

export function TenantWorkspaceShell({ children }: { children: React.ReactNode }) {
  const workspace = useTenantWorkspace();

  if (workspace.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Cargando contexto del espacio de trabajo...
      </div>
    );
  }

  return (
    <TenantAppShell
      brandIcon={Building2}
      brandTitle="Durania"
      brandSubtitle={workspace.panel === "producer" ? "Operacion Productor" : "Operacion MVZ"}
      mode={workspace.mode}
      currentSectionLabel={workspace.currentSectionLabel}
      navigation={workspace.navigation}
      breadcrumbs={workspace.breadcrumbs}
      organizationName={workspace.organization?.name ?? "Tenant"}
      environmentLabel={workspace.environmentLabel}
      projects={workspace.projects}
      currentProjectId={workspace.currentProject?.id ?? workspace.selectedProjectId}
      currentProjectName={workspace.currentProject?.name ?? null}
      currentProjectSubtitle={
        workspace.currentProject?.producerName ?? workspace.currentProject?.code ?? null
      }
      userDisplayName={workspace.user?.displayName ?? "Usuario"}
      userEmail={workspace.user?.email ?? ""}
      userRoleLabel={workspace.user?.roleLabel ?? ""}
      settingsHref={buildSettingsHref(workspace.panel)}
      onProjectChange={workspace.navigateToProject}
      errorMessage={workspace.error}
    >
      {children}
    </TenantAppShell>
  );
}
