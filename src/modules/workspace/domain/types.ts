import type { LucideIcon } from "lucide-react";
import type { AppRole, PermissionKey } from "@/shared/lib/auth";

export type WorkspacePanel = "producer" | "mvz";
export type WorkspaceMode = "organization" | "project";

export interface WorkspaceOrganization {
  id: string;
  slug: string;
  name: string;
  type: "producer" | "mvz";
  panel: WorkspacePanel;
}

export interface WorkspaceProject {
  id: string;
  name: string;
  code: string | null;
  status: string;
  kind: "upp" | "rancho";
  addressText?: string | null;
  hectaresTotal?: number | null;
  herdLimit?: number | null;
  producerName?: string | null;
  sanitaryAlert?: string | null;
  activeAnimals?: number | null;
  assignedAt?: string | null;
}

export interface WorkspaceUser {
  email: string;
  displayName: string;
  role: AppRole;
  roleLabel: string;
  permissions: PermissionKey[];
}

export type WorkspaceBreadcrumbItem =
  | {
      type: "link";
      label: string;
      href: string;
    }
  | {
      type: "page";
      label: string;
    }
  | {
      type: "project-selector";
      label: string;
      projectId: string | null;
    };

export interface ResolvedNavItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  mode: WorkspaceMode;
}
