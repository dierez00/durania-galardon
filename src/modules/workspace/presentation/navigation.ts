import {
  Activity,
  ClipboardList,
  FileStack,
  FileText,
  FolderKanban,
  ShieldCheck,
  Stethoscope,
  Syringe,
  Truck,
  Users,
} from "lucide-react";
import type { PermissionKey } from "@/shared/lib/auth";
import type {
  ResolvedNavItem,
  WorkspaceMode,
  WorkspacePanel,
} from "@/modules/workspace/domain/types";
import {
  buildMetricsHref,
  buildOrganizationHref,
  buildProjectHref,
  buildSettingsHref,
} from "@/modules/workspace/presentation/workspace-routing";

interface NavigationRule {
  key: string;
  label: string;
  icon: typeof FolderKanban;
  exact?: boolean;
  permissions?: PermissionKey[];
  anyPermissions?: PermissionKey[];
}

const PRODUCER_ORGANIZATION_NAVIGATION: NavigationRule[] = [
  {
    key: "projects",
    label: "Ranchos / UPPs",
    icon: FolderKanban,
    exact: true,
    permissions: ["producer.upp.read"],
  },
  {
    key: "metrics",
    label: "Metricas",
    icon: Activity,
    exact: true,
    permissions: ["producer.dashboard.read"],
  },
  {
    key: "settings",
    label: "Configuracion",
    icon: ShieldCheck,
    exact: true,
    anyPermissions: ["producer.upp.read", "producer.documents.read", "producer.employees.read"],
  },
];

const PRODUCER_PROJECT_NAVIGATION: NavigationRule[] = [
  {
    key: "overview",
    label: "Overview",
    icon: FolderKanban,
    exact: true,
    permissions: ["producer.upp.read"],
  },
  {
    key: "animales",
    label: "Animales",
    icon: Activity,
    exact: true,
    permissions: ["producer.bovinos.read"],
  },
  {
    key: "documentos",
    label: "Documentos",
    icon: FileText,
    exact: true,
    permissions: ["producer.documents.read"],
  },
  {
    key: "movilizacion",
    label: "Movilizaciones",
    icon: Truck,
    exact: true,
    permissions: ["producer.movements.read"],
  },
  {
    key: "exportaciones",
    label: "Exportaciones",
    icon: ClipboardList,
    exact: true,
    permissions: ["producer.exports.read"],
  },
  {
    key: "details",
    label: "Detalles",
    icon: FileStack,
    exact: true,
    permissions: ["producer.upp.read"],
  },
];

const MVZ_ORGANIZATION_NAVIGATION: NavigationRule[] = [
  {
    key: "projects",
    label: "Ranchos asignados",
    icon: FolderKanban,
    exact: true,
    permissions: ["mvz.assignments.read"],
  },
  {
    key: "metrics",
    label: "Metricas",
    icon: Activity,
    exact: true,
    permissions: ["mvz.dashboard.read"],
  },
  {
    key: "settings",
    label: "Configuracion",
    icon: ShieldCheck,
    exact: true,
    anyPermissions: ["mvz.dashboard.read", "mvz.assignments.read"],
  },
];

const MVZ_PROJECT_NAVIGATION: NavigationRule[] = [
  {
    key: "overview",
    label: "Overview",
    icon: FolderKanban,
    exact: true,
    permissions: ["mvz.ranch.read"],
  },
  {
    key: "animales",
    label: "Animales",
    icon: Activity,
    exact: true,
    permissions: ["mvz.ranch.animals.read"],
  },
  {
    key: "historial-clinico",
    label: "Historial clinico",
    icon: Stethoscope,
    exact: true,
    permissions: ["mvz.ranch.clinical.read"],
  },
  {
    key: "vacunacion",
    label: "Vacunacion",
    icon: Syringe,
    exact: true,
    permissions: ["mvz.ranch.vaccinations.read"],
  },
  {
    key: "incidencias",
    label: "Incidencias",
    icon: ClipboardList,
    exact: true,
    permissions: ["mvz.ranch.incidents.read"],
  },
  {
    key: "reportes",
    label: "Reportes",
    icon: FileStack,
    exact: true,
    permissions: ["mvz.ranch.reports.read"],
  },
  {
    key: "documentacion",
    label: "Documentacion",
    icon: FileText,
    exact: true,
    permissions: ["mvz.ranch.documents.read"],
  },
  {
    key: "visitas",
    label: "Visitas",
    icon: Users,
    exact: true,
    permissions: ["mvz.ranch.visits.read"],
  },
];

function isNavigationAllowed(rule: NavigationRule, permissions: PermissionKey[]) {
  if (rule.permissions?.length) {
    return rule.permissions.every((permission) => permissions.includes(permission));
  }

  if (rule.anyPermissions?.length) {
    return rule.anyPermissions.some((permission) => permissions.includes(permission));
  }

  return true;
}

export function resolveWorkspaceNavigation(
  panel: WorkspacePanel,
  mode: WorkspaceMode,
  permissions: PermissionKey[],
  projectId: string | null
): ResolvedNavItem[] {
  const rules =
    panel === "producer"
      ? mode === "organization"
        ? PRODUCER_ORGANIZATION_NAVIGATION
        : PRODUCER_PROJECT_NAVIGATION
      : mode === "organization"
        ? MVZ_ORGANIZATION_NAVIGATION
        : MVZ_PROJECT_NAVIGATION;

  return rules
    .filter((rule) => isNavigationAllowed(rule, permissions))
    .map((rule) => ({
      key: rule.key,
      label: rule.label,
      icon: rule.icon,
      exact: rule.exact,
      mode,
      href:
        mode === "organization"
          ? rule.key === "projects"
            ? buildOrganizationHref(panel)
            : rule.key === "metrics"
              ? buildMetricsHref(panel)
              : buildSettingsHref(panel)
          : buildProjectHref(panel, projectId ?? "", rule.key),
    }));
}
