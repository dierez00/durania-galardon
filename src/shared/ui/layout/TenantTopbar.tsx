"use client";

import Link from "next/link";
import { Fragment } from "react";
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
  WorkspaceProject,
} from "@/modules/workspace/domain/types";

interface TenantTopbarProps {
  breadcrumbs: WorkspaceBreadcrumbItem[];
  projects: WorkspaceProject[];
  currentProjectId: string | null;
  onProjectChange: (projectId: string) => void;
  userDisplayName: string;
  userEmail: string;
  userRoleLabel: string;
  settingsHref: string;
}

export function TenantTopbar({
  breadcrumbs,
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
        <div className="min-w-0">
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((item, index) => (
                <Fragment key={`${item.type}-${item.label}-${index}`}>
                  <BreadcrumbItem>
                    {item.type === "link" ? (
                      <BreadcrumbLink asChild>
                        <Link href={item.href}>{item.label}</Link>
                      </BreadcrumbLink>
                    ) : item.type === "project-selector" ? (
                      <ProjectSelector
                        projects={projects}
                        currentProjectId={item.projectId ?? currentProjectId}
                        currentLabel={item.label}
                        onProjectChange={onProjectChange}
                      />
                    ) : (
                      <BreadcrumbPage>{item.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {index < breadcrumbs.length - 1 ? <BreadcrumbSeparator /> : null}
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
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
