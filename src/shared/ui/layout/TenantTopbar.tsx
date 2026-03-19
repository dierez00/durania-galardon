"use client";

import Link from "next/link";
import { Badge } from "@/shared/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/ui/breadcrumb";
import { ProfileMenu } from "@/shared/ui/layout/ProfileMenu";
import { ProjectSelector } from "@/shared/ui/layout/ProjectSelector";
import type {
  WorkspaceBreadcrumbItem,
  WorkspaceMode,
  WorkspaceProject,
} from "@/modules/workspace/domain/types";

interface TenantTopbarProps {
  mode: WorkspaceMode;
  breadcrumbs: WorkspaceBreadcrumbItem[];
  environmentLabel: string | null;
  projects: WorkspaceProject[];
  currentProjectId: string | null;
  onProjectChange: (projectId: string) => void;
  userDisplayName: string;
  userEmail: string;
  userRoleLabel: string;
  settingsHref: string;
}

export function TenantTopbar({
  mode,
  breadcrumbs,
  environmentLabel,
  projects,
  currentProjectId,
  onProjectChange,
  userDisplayName,
  userEmail,
  userRoleLabel,
  settingsHref,
}: TenantTopbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="flex min-h-16 items-center justify-between gap-4 px-5 py-3">
        <div className="min-w-0 space-y-2">
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((item, index) => (
                <div key={`${item.label}-${index}`} className="flex items-center gap-1.5">
                  <BreadcrumbItem>
                    {item.href && index < breadcrumbs.length - 1 ? (
                      <BreadcrumbLink asChild>
                        <Link href={item.href}>{item.label}</Link>
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{item.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {index < breadcrumbs.length - 1 ? <BreadcrumbSeparator /> : null}
                </div>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex flex-wrap items-center gap-3">
            {mode === "project" ? (
              <ProjectSelector
                projects={projects}
                currentProjectId={currentProjectId}
                onProjectChange={onProjectChange}
              />
            ) : null}
            {environmentLabel ? (
              <Badge variant="outline" className="font-mono text-[11px] uppercase tracking-wide">
                {environmentLabel}
              </Badge>
            ) : null}
          </div>
        </div>

        <ProfileMenu
          displayName={userDisplayName}
          email={userEmail}
          roleLabel={userRoleLabel}
          settingsHref={settingsHref}
        />
      </div>
    </header>
  );
}
