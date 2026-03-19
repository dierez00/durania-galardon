import type { WorkspaceMode, WorkspacePanel } from "@/modules/workspace/domain/types";

const PRODUCER_ORGANIZATION_LABELS = {
  projects: "Ranchos / UPPs",
  metrics: "Metricas",
  settings: "Configuracion",
} as const;

const PRODUCER_PROJECT_LABELS = {
  overview: "Overview",
  animales: "Animales",
  documentos: "Documentos",
  movilizacion: "Movilizaciones",
  exportaciones: "Exportaciones",
  details: "Detalles",
} as const;

const MVZ_ORGANIZATION_LABELS = {
  projects: "Ranchos asignados",
  metrics: "Metricas",
  settings: "Configuracion",
} as const;

const MVZ_PROJECT_LABELS = {
  overview: "Overview",
  animales: "Animales",
  "historial-clinico": "Historial clinico",
  vacunacion: "Vacunacion",
  incidencias: "Incidencias",
  reportes: "Reportes",
  documentacion: "Documentacion",
  visitas: "Visitas",
} as const;

export interface WorkspaceLocation {
  panel: WorkspacePanel;
  mode: WorkspaceMode;
  projectId: string | null;
  sectionKey: string;
  sectionLabel: string;
  moduleKey: string | null;
}

export function resolveWorkspacePanel(pathname: string): WorkspacePanel | null {
  if (pathname === "/producer" || pathname.startsWith("/producer/")) {
    return "producer";
  }

  if (pathname === "/mvz" || pathname.startsWith("/mvz/")) {
    return "mvz";
  }

  return null;
}

export function getSelectedProjectStorageKey(panel: WorkspacePanel, tenantId: string) {
  return `${panel}:selectedUppId:${tenantId}`;
}

export function getLastModuleStorageKey(
  panel: WorkspacePanel,
  tenantId: string,
  projectId: string
) {
  return `workspace:lastModule:${panel}:${tenantId}:${projectId}`;
}

export function resolveWorkspaceLocation(pathname: string): WorkspaceLocation | null {
  const segments = pathname.split("/").filter(Boolean);
  const panel = resolveWorkspacePanel(pathname);

  if (!panel || segments.length === 0) {
    return null;
  }

  if (panel === "producer") {
    if (segments[1] === "projects" && segments[2]) {
      const moduleKey =
        (segments[3] as keyof typeof PRODUCER_PROJECT_LABELS | undefined) ?? "overview";
      return {
        panel,
        mode: "project",
        projectId: segments[2],
        sectionKey: moduleKey,
        sectionLabel: PRODUCER_PROJECT_LABELS[moduleKey] ?? PRODUCER_PROJECT_LABELS.overview,
        moduleKey,
      };
    }

    const sectionKey =
      (segments[1] as keyof typeof PRODUCER_ORGANIZATION_LABELS | undefined) ?? "projects";
    return {
      panel,
      mode: "organization",
      projectId: null,
      sectionKey,
      sectionLabel:
        PRODUCER_ORGANIZATION_LABELS[sectionKey] ?? PRODUCER_ORGANIZATION_LABELS.projects,
      moduleKey: null,
    };
  }

  if (segments[1] === "ranchos" && segments[2]) {
    const moduleKey = (segments[3] as keyof typeof MVZ_PROJECT_LABELS | undefined) ?? "overview";
    return {
      panel,
      mode: "project",
      projectId: segments[2],
      sectionKey: moduleKey,
      sectionLabel: MVZ_PROJECT_LABELS[moduleKey] ?? MVZ_PROJECT_LABELS.overview,
      moduleKey,
    };
  }

  const sectionKey =
    (segments[1] as keyof typeof MVZ_ORGANIZATION_LABELS | undefined) ?? "projects";
  return {
    panel,
    mode: "organization",
    projectId: null,
    sectionKey,
    sectionLabel: MVZ_ORGANIZATION_LABELS[sectionKey] ?? MVZ_ORGANIZATION_LABELS.projects,
    moduleKey: null,
  };
}

export function buildOrganizationHref(panel: WorkspacePanel) {
  return panel === "producer" ? "/producer" : "/mvz";
}

export function buildMetricsHref(panel: WorkspacePanel) {
  return panel === "producer" ? "/producer/metrics" : "/mvz/metrics";
}

export function buildSettingsHref(panel: WorkspacePanel) {
  return panel === "producer" ? "/producer/settings" : "/mvz/settings";
}

export function buildProjectHref(
  panel: WorkspacePanel,
  projectId: string,
  moduleKey: string | null | undefined
) {
  const normalizedModule = !moduleKey || moduleKey === "overview" ? "" : moduleKey;

  if (panel === "producer") {
    return normalizedModule
      ? `/producer/projects/${projectId}/${normalizedModule}`
      : `/producer/projects/${projectId}`;
  }

  return normalizedModule
    ? `/mvz/ranchos/${projectId}/${normalizedModule}`
    : `/mvz/ranchos/${projectId}`;
}

export function getDefaultModuleKey() {
  return "overview";
}

export function getOrganizationSectionLabel(panel: WorkspacePanel, sectionKey: string) {
  if (panel === "producer") {
    return (
      PRODUCER_ORGANIZATION_LABELS[
        sectionKey as keyof typeof PRODUCER_ORGANIZATION_LABELS
      ] ?? PRODUCER_ORGANIZATION_LABELS.projects
    );
  }

  return (
    MVZ_ORGANIZATION_LABELS[sectionKey as keyof typeof MVZ_ORGANIZATION_LABELS] ??
    MVZ_ORGANIZATION_LABELS.projects
  );
}

export function getProjectModuleLabel(panel: WorkspacePanel, moduleKey: string) {
  if (panel === "producer") {
    return (
      PRODUCER_PROJECT_LABELS[moduleKey as keyof typeof PRODUCER_PROJECT_LABELS] ??
      PRODUCER_PROJECT_LABELS.overview
    );
  }

  return (
    MVZ_PROJECT_LABELS[moduleKey as keyof typeof MVZ_PROJECT_LABELS] ??
    MVZ_PROJECT_LABELS.overview
  );
}
