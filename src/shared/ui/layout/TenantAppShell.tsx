"use client";

import { TenantSidebar } from "@/shared/ui/layout/TenantSidebar";
import { TenantTopbar } from "@/shared/ui/layout/TenantTopbar";
import type {
  ResolvedNavItem,
  WorkspaceBreadcrumbItem,
  WorkspaceProject,
} from "@/modules/workspace/domain/types";

interface TenantAppShellProps {
  brandSubtitle: string;
  navigation: ResolvedNavItem[];
  breadcrumbs: WorkspaceBreadcrumbItem[];
  projects: WorkspaceProject[];
  currentProjectId: string | null;
  userDisplayName: string;
  userEmail: string;
  userRoleLabel: string;
  profileHref: string;
  canAccessPanelSettings: boolean;
  settingsHref: string;
  onProjectChange: (projectId: string) => void;
  errorMessage?: string;
  children: React.ReactNode;
}

export function TenantAppShell({
  brandSubtitle,
  navigation,
  breadcrumbs,
  projects,
  currentProjectId,
  userDisplayName,
  userEmail,
  userRoleLabel,
  profileHref,
  canAccessPanelSettings,
  settingsHref,
  onProjectChange,
  errorMessage,
  children,
}: TenantAppShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <TenantSidebar
        brandSubtitle={brandSubtitle}
        navigation={navigation}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TenantTopbar
          breadcrumbs={breadcrumbs}
          projects={projects}
          currentProjectId={currentProjectId}
          onProjectChange={onProjectChange}
          userDisplayName={userDisplayName}
          userEmail={userEmail}
          userRoleLabel={userRoleLabel}
          profileHref={profileHref}
          canAccessPanelSettings={canAccessPanelSettings}
          settingsHref={settingsHref}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {errorMessage ? (
            <p className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
