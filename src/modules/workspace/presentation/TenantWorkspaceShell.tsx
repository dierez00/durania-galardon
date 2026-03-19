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
      brandSubtitle={workspace.panel === "producer" ? "Operacion Productor" : "Operacion MVZ"}
      navigation={workspace.navigation}
      breadcrumbs={workspace.breadcrumbs}
      projects={workspace.projects}
      currentProjectId={workspace.currentProject?.id ?? workspace.selectedProjectId}
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
