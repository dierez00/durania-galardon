"use client";

import { Building2 } from "lucide-react";
import {
  MVZ_SETTINGS_NAV_PERMISSIONS,
  PRODUCER_SETTINGS_NAV_PERMISSIONS,
} from "@/shared/lib/auth";
import { TenantAppShell } from "@/shared/ui/layout/TenantAppShell";
import { useTenantWorkspace } from "@/modules/workspace/presentation/TenantWorkspaceContext";
import {
  buildProfileHref,
  buildSettingsHref,
} from "@/modules/workspace/presentation/workspace-routing";

export function TenantWorkspaceShell({ children }: { children: React.ReactNode }) {
  const workspace = useTenantWorkspace();
  const canAccessPanelSettings =
    workspace.panel === "producer"
      ? PRODUCER_SETTINGS_NAV_PERMISSIONS.some((permission) =>
          Boolean(workspace.user?.permissions.includes(permission))
        )
      : !workspace.user?.isMvzInternal &&
        MVZ_SETTINGS_NAV_PERMISSIONS.some((permission) =>
          Boolean(workspace.user?.permissions.includes(permission))
        );

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
      profileHref={buildProfileHref(workspace.panel)}
      canAccessPanelSettings={canAccessPanelSettings}
      settingsHref={buildSettingsHref(workspace.panel)}
      onProjectChange={workspace.navigateToProject}
      errorMessage={workspace.error}
    >
      {children}
    </TenantAppShell>
  );
}
