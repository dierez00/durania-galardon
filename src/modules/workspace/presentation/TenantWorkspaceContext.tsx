"use client";

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { ROLE_LABELS, type AppRole, type PermissionKey } from "@/shared/lib/auth";
import { getAccessToken } from "@/shared/lib/auth-session";
import type {
  ResolvedNavItem,
  WorkspaceBreadcrumbItem,
  WorkspaceMode,
  WorkspaceOrganization,
  WorkspacePanel,
  WorkspaceProject,
  WorkspaceSelectorOption,
  WorkspaceUser,
} from "@/modules/workspace/domain/types";
import { resolveWorkspaceNavigation } from "@/modules/workspace/presentation/navigation";
import {
  buildOrganizationHref,
  buildProjectHref,
  getDefaultModuleKey,
  getLastModuleStorageKey,
  getOrganizationSectionLabel,
  getProjectModuleLabel,
  getSelectedProjectStorageKey,
  resolveWorkspaceLocation,
} from "@/modules/workspace/presentation/workspace-routing";
import {
  PROFILE_DISPLAY_NAME_UPDATED_EVENT,
  type ProfileDisplayNameUpdatedDetail,
} from "@/shared/lib/profile-events";

interface AuthMePayload {
  data?: {
    user?: {
      email?: string;
      role?: AppRole;
      roleKey?: string;
      roleName?: string;
      isSystemRole?: boolean;
      isMvzInternal?: boolean;
      displayName?: string | null;
    };
    tenant?: {
      id?: string;
      slug?: string;
      type?: "producer" | "mvz";
      name?: string;
    };
    panelType?: "producer" | "mvz" | "government";
    permissions?: PermissionKey[];
  };
}

function canLoadWorkspaceProjects(panel: WorkspacePanel, permissions: PermissionKey[]) {
  return panel === "producer"
    ? permissions.includes("producer.upp.read")
    : permissions.includes("mvz.assignments.read");
}

interface ProducerProjectsPayload {
  data?: {
    upps?: Array<{
      id: string;
      name: string;
      upp_code: string | null;
      status: string;
      herd_limit: number | null;
      hectares_total: number | null;
      address_text: string | null;
    }>;
  };
}

interface MvzProjectsPayload {
  data?: {
    assignments?: Array<{
      upp_id: string;
      upp_name: string;
      upp_code: string | null;
      upp_status: string;
      producer_name: string;
      sanitary_alert: string | null;
      active_animals: number | null;
      assigned_at: string | null;
    }>;
  };
}

interface TenantWorkspaceContextValue {
  loading: boolean;
  error: string;
  panel: WorkspacePanel;
  mode: WorkspaceMode;
  organization: WorkspaceOrganization | null;
  user: WorkspaceUser | null;
  projects: WorkspaceProject[];
  currentProject: WorkspaceProject | null;
  selectedProjectId: string | null;
  currentSectionLabel: string;
  navigation: ResolvedNavItem[];
  breadcrumbs: WorkspaceBreadcrumbItem[];
  setSelectedProjectId: (projectId: string | null) => void;
  navigateToProject: (projectId: string) => void;
  clearSelectedProject: () => void;
  setDetailBreadcrumbLabel: (label: string | null) => void;
  setDetailBreadcrumbSelector: (
    selector:
      | {
          detailId: string | null;
          options: WorkspaceSelectorOption[];
          onDetailChange: (detailId: string) => void;
          searchPlaceholder?: string;
          emptyMessage?: string;
        }
      | null
  ) => void;
}

const TenantWorkspaceContext = createContext<TenantWorkspaceContextValue | null>(null);

async function fetchJson<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(path, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`REQUEST_FAILED:${path}`);
  }

  return (await response.json()) as T;
}

function mapProducerProjects(payload: ProducerProjectsPayload): WorkspaceProject[] {
  return (payload.data?.upps ?? []).map((upp) => ({
    id: upp.id,
    name: upp.name,
    code: upp.upp_code,
    status: upp.status,
    kind: "upp",
    addressText: upp.address_text,
    hectaresTotal: upp.hectares_total,
    herdLimit: upp.herd_limit,
  }));
}

function mapMvzProjects(payload: MvzProjectsPayload): WorkspaceProject[] {
  return (payload.data?.assignments ?? []).map((assignment) => ({
    id: assignment.upp_id,
    name: assignment.upp_name,
    code: assignment.upp_code,
    status: assignment.upp_status,
    kind: "rancho",
    producerName: assignment.producer_name,
    sanitaryAlert: assignment.sanitary_alert,
    activeAnimals: assignment.active_animals,
    assignedAt: assignment.assigned_at,
  }));
}

function findProject(projects: WorkspaceProject[], projectId: string | null) {
  if (!projectId) {
    return null;
  }

  return projects.find((project) => project.id === projectId) ?? null;
}

export function TenantWorkspaceProvider({
  panel,
  children,
}: {
  panel: WorkspacePanel;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [organization, setOrganization] = useState<WorkspaceOrganization | null>(null);
  const [user, setUser] = useState<WorkspaceUser | null>(null);
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(null);
  const [detailBreadcrumbLabel, setDetailBreadcrumbLabel] = useState<string | null>(null);
  const [detailBreadcrumbSelector, setDetailBreadcrumbSelector] = useState<{
    detailId: string | null;
    options: WorkspaceSelectorOption[];
    onDetailChange: (detailId: string) => void;
    searchPlaceholder?: string;
    emptyMessage?: string;
  } | null>(null);

  const location = useMemo(() => resolveWorkspaceLocation(pathname), [pathname]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError("");

      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          throw new Error("UNAUTHORIZED");
        }

        const authPayload = await fetchJson<AuthMePayload>("/api/auth/me", accessToken);
        const authData = authPayload.data;

        if (!authData?.tenant?.id || !authData.tenant.slug || !authData.tenant.name) {
          throw new Error("WORKSPACE_TENANT_CONTEXT_MISSING");
        }

        if (authData.panelType !== panel) {
          throw new Error("WORKSPACE_PANEL_MISMATCH");
        }

        const resolvedRole = authData.user?.role ?? (panel === "producer" ? "producer" : "mvz_government");
        const nextOrganization: WorkspaceOrganization = {
          id: authData.tenant.id,
          slug: authData.tenant.slug,
          name: authData.tenant.name,
          type: authData.tenant.type === "mvz" ? "mvz" : "producer",
          panel,
        };

        const permissions = authData.permissions ?? [];
        const nextUser: WorkspaceUser = {
          email: authData.user?.email ?? "",
          displayName: authData.user?.displayName?.trim() || authData.user?.email || "",
          role: resolvedRole,
          roleKey: authData.user?.roleKey ?? resolvedRole,
          roleName: authData.user?.roleName ?? ROLE_LABELS[resolvedRole] ?? resolvedRole,
          roleLabel: authData.user?.roleName ?? ROLE_LABELS[resolvedRole] ?? resolvedRole,
          isSystemRole: authData.user?.isSystemRole ?? true,
          isMvzInternal: authData.user?.isMvzInternal ?? false,
          permissions,
        };

        let nextProjects: WorkspaceProject[] = [];
        if (canLoadWorkspaceProjects(panel, permissions)) {
          const projectsPayload =
            panel === "producer"
              ? await fetchJson<ProducerProjectsPayload>("/api/producer/upp", accessToken)
              : await fetchJson<MvzProjectsPayload>("/api/mvz/assignments", accessToken);

          nextProjects =
            panel === "producer"
              ? mapProducerProjects(projectsPayload as ProducerProjectsPayload)
              : mapMvzProjects(projectsPayload as MvzProjectsPayload);
        }

        if (cancelled) {
          return;
        }

        setOrganization(nextOrganization);
        setUser(nextUser);
        setProjects(nextProjects);

        const routeProjectId = location?.panel === panel ? location.projectId : null;
        const storageKey = getSelectedProjectStorageKey(panel, nextOrganization.id);
        const storedProjectId = sessionStorage.getItem(storageKey);
        const preferredProjectId = routeProjectId ?? storedProjectId;
        const nextSelectedProjectId =
          preferredProjectId && nextProjects.some((project) => project.id === preferredProjectId)
            ? preferredProjectId
            : null;

        setSelectedProjectIdState(nextSelectedProjectId);
      } catch (nextError) {
        if (cancelled) {
          return;
        }

        setError(nextError instanceof Error ? nextError.message : "No fue posible cargar el workspace.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [location?.panel, location?.projectId, panel]);

  useEffect(() => {
    if (!organization || !location || location.panel !== panel) {
      return;
    }

    const storageKey = getSelectedProjectStorageKey(panel, organization.id);
    if (location.projectId) {
      sessionStorage.setItem(storageKey, location.projectId);
      setSelectedProjectIdState(location.projectId);
    }
  }, [location, organization, panel]);

  useEffect(() => {
    if (!organization || !location || location.panel !== panel || location.mode !== "project" || !location.projectId) {
      return;
    }

    const lastModuleKey = getLastModuleStorageKey(panel, organization.id, location.projectId);
    sessionStorage.setItem(lastModuleKey, location.moduleKey ?? getDefaultModuleKey());
  }, [location, organization, panel]);

  useEffect(() => {
    const handleDisplayNameUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<ProfileDisplayNameUpdatedDetail>;
      const nextDisplayName = customEvent.detail?.displayName?.trim();

      if (!nextDisplayName) {
        return;
      }

      setUser((currentUser) =>
        currentUser
          ? {
              ...currentUser,
              displayName: nextDisplayName,
            }
          : currentUser
      );
    };

    window.addEventListener(PROFILE_DISPLAY_NAME_UPDATED_EVENT, handleDisplayNameUpdated);

    return () => {
      window.removeEventListener(PROFILE_DISPLAY_NAME_UPDATED_EVENT, handleDisplayNameUpdated);
    };
  }, []);

  const currentProject = useMemo(() => {
    if (location?.panel === panel && location.projectId) {
      return findProject(projects, location.projectId);
    }

    return findProject(projects, selectedProjectId);
  }, [location, panel, projects, selectedProjectId]);

  const mode: WorkspaceMode =
    location?.panel === panel && location.mode === "project" ? "project" : "organization";

  const currentSectionLabel = useMemo(() => {
    if (mode === "project") {
      return getProjectModuleLabel(panel, location?.moduleKey ?? getDefaultModuleKey());
    }

    return getOrganizationSectionLabel(panel, location?.sectionKey ?? "projects");
  }, [location?.moduleKey, location?.sectionKey, mode, panel]);

  const navigation = useMemo(
    () => resolveWorkspaceNavigation(panel, mode, user, currentProject?.id ?? null),
    [currentProject?.id, mode, panel, user]
  );

  useEffect(() => {
    setDetailBreadcrumbLabel(null);
    setDetailBreadcrumbSelector(null);
  }, [location?.detailId, panel]);

  const breadcrumbs = useMemo<WorkspaceBreadcrumbItem[]>(() => {
    if (!organization) {
      return [];
    }

    const homeHref = buildOrganizationHref(panel);

    if (mode === "project") {
      const projectId = currentProject?.id ?? location?.projectId ?? selectedProjectId ?? null;
      const items: WorkspaceBreadcrumbItem[] = [
        { type: "link", label: "Inicio", href: homeHref },
        {
          type: "project-selector",
          label: currentProject?.name ?? "Seleccionar rancho",
          projectId,
        },
      ];

      if (location?.detailId && location.moduleKey) {
        items.push({
          type: "link",
          label: currentSectionLabel,
          href: buildProjectHref(panel, projectId ?? location.projectId ?? "", location.moduleKey),
        });
        if (detailBreadcrumbSelector?.options.length) {
          items.push({
            type: "detail-selector",
            label: detailBreadcrumbLabel ?? "Detalle",
            detailId: detailBreadcrumbSelector.detailId,
            options: detailBreadcrumbSelector.options,
            onDetailChange: detailBreadcrumbSelector.onDetailChange,
            searchPlaceholder: detailBreadcrumbSelector.searchPlaceholder,
            emptyMessage: detailBreadcrumbSelector.emptyMessage,
          });
        } else {
          items.push({ type: "page", label: detailBreadcrumbLabel ?? "Detalle" });
        }
        return items;
      }

      if ((location?.moduleKey ?? getDefaultModuleKey()) !== getDefaultModuleKey()) {
        items.push({ type: "page", label: currentSectionLabel });
      }

      return items;
    }

    if ((location?.sectionKey ?? "projects") !== "projects") {
      return [
        { type: "link", label: "Inicio", href: homeHref },
        { type: "page", label: currentSectionLabel },
      ];
    }

    return [{ type: "page", label: "Inicio" }];
  }, [
    currentProject,
    currentSectionLabel,
    detailBreadcrumbLabel,
    detailBreadcrumbSelector,
    location?.detailId,
    location?.moduleKey,
    location?.projectId,
    location?.sectionKey,
    mode,
    organization,
    panel,
    selectedProjectId,
  ]);

  const setSelectedProjectId = (projectId: string | null) => {
    if (!organization) {
      return;
    }

    const storageKey = getSelectedProjectStorageKey(panel, organization.id);
    setSelectedProjectIdState(projectId);

    if (projectId) {
      sessionStorage.setItem(storageKey, projectId);
    } else {
      sessionStorage.removeItem(storageKey);
    }
  };

  const navigateToProject = (projectId: string) => {
    if (!organization || !user) {
      return;
    }

    const availableModules = resolveWorkspaceNavigation(panel, "project", user, projectId);
    const storedModuleKey = sessionStorage.getItem(
      getLastModuleStorageKey(panel, organization.id, projectId)
    );
    const defaultModuleKey = availableModules[0]?.key ?? getDefaultModuleKey();
    const nextModuleKey = availableModules.some((item) => item.key === storedModuleKey)
      ? storedModuleKey
      : defaultModuleKey;

    setSelectedProjectId(projectId);
    startTransition(() => {
      router.push(buildProjectHref(panel, projectId, nextModuleKey));
    });
  };

  const clearSelectedProject = () => {
    setSelectedProjectId(null);
  };

  const value = useMemo<TenantWorkspaceContextValue>(
    () => ({
      loading,
      error,
      panel,
      mode,
      organization,
      user,
      projects,
      currentProject,
      selectedProjectId,
      currentSectionLabel,
      navigation,
      breadcrumbs,
      setSelectedProjectId,
      navigateToProject,
      clearSelectedProject,
      setDetailBreadcrumbLabel,
      setDetailBreadcrumbSelector,
    }),
    [
      breadcrumbs,
      currentProject,
      currentSectionLabel,
      error,
      loading,
      mode,
      navigation,
      organization,
      panel,
      projects,
      selectedProjectId,
      user,
    ]
  );

  return (
    <TenantWorkspaceContext.Provider value={value}>
      {children}
    </TenantWorkspaceContext.Provider>
  );
}

export function useTenantWorkspace() {
  const context = useContext(TenantWorkspaceContext);
  if (!context) {
    throw new Error("useTenantWorkspace must be used within TenantWorkspaceProvider");
  }

  return context;
}
