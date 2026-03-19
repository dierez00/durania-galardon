"use client";

import type { ComponentType } from "react";
import { TenantSidebar } from "@/shared/ui/layout/TenantSidebar";
import { TenantTopbar } from "@/shared/ui/layout/TenantTopbar";
import type {
  ResolvedNavItem,
  WorkspaceBreadcrumbItem,
  WorkspaceMode,
  WorkspaceProject,
} from "@/modules/workspace/domain/types";

interface TenantAppShellProps {
  brandIcon: ComponentType<{ className?: string }>;
  brandTitle: string;
  brandSubtitle: string;
  mode: WorkspaceMode;
  currentSectionLabel: string;
  navigation: ResolvedNavItem[];
  breadcrumbs: WorkspaceBreadcrumbItem[];
  organizationName: string;
  environmentLabel: string | null;
  projects: WorkspaceProject[];
  currentProjectId: string | null;
  currentProjectName: string | null;
  currentProjectSubtitle?: string | null;
  userDisplayName: string;
  userEmail: string;
  userRoleLabel: string;
  settingsHref: string;
  onProjectChange: (projectId: string) => void;
  errorMessage?: string;
  children: React.ReactNode;
}

export function TenantAppShell({
  brandIcon,
  brandTitle,
  brandSubtitle,
  mode,
  currentSectionLabel,
  navigation,
  breadcrumbs,
  organizationName,
  environmentLabel,
  projects,
  currentProjectId,
  currentProjectName,
  currentProjectSubtitle,
  userDisplayName,
  userEmail,
  userRoleLabel,
  settingsHref,
  onProjectChange,
  errorMessage,
  children,
}: TenantAppShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <TenantSidebar
        brandIcon={brandIcon}
        brandTitle={brandTitle}
        brandSubtitle={brandSubtitle}
        mode={mode}
        navigation={navigation}
        contextTitle={mode === "organization" ? organizationName : currentProjectName ?? organizationName}
        contextSubtitle={mode === "organization" ? currentSectionLabel : currentProjectSubtitle}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TenantTopbar
          mode={mode}
          breadcrumbs={breadcrumbs}
          environmentLabel={environmentLabel}
          projects={projects}
          currentProjectId={currentProjectId}
          onProjectChange={onProjectChange}
          userDisplayName={userDisplayName}
          userEmail={userEmail}
          userRoleLabel={userRoleLabel}
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
