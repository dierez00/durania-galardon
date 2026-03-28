"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AdminEmpleadosPage from "@/modules/admin/empleados/presentation/AdminEmpleadosPage";
import { TenantRolesManager } from "@/modules/iam";
import { getAccessToken } from "@/shared/lib/auth-session";
import {
  ADMIN_SETTINGS_NAV_PERMISSIONS,
  hasAnyPermission,
  type PermissionKey,
} from "@/shared/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import AdminSettingsAuditTab from "./AdminSettingsAuditTab";
import AdminSettingsOverviewTab from "./AdminSettingsOverviewTab";

interface AuthMePayload {
  ok?: boolean;
  data?: {
    permissions?: PermissionKey[];
  };
  error?: {
    message?: string;
  };
}

type AdminSettingsTabKey = "overview" | "audit" | "employees" | "roles";

export default function AdminSettingsPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);

  useEffect(() => {
    const loadPermissions = async () => {
      setLoadingPermissions(true);
      setErrorMessage("");

      const accessToken = await getAccessToken();
      if (!accessToken) {
        setErrorMessage("No existe sesion activa.");
        setLoadingPermissions(false);
        return;
      }

      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      const body = (await response.json()) as AuthMePayload;
      if (!response.ok || !body.ok) {
        setErrorMessage(body.error?.message ?? "No fue posible cargar los permisos del panel.");
        setLoadingPermissions(false);
        return;
      }

      setPermissions(body.data?.permissions ?? []);
      setLoadingPermissions(false);
    };

    void loadPermissions();
  }, []);

  const tabs = useMemo(
    () =>
      [
        {
          key: "overview" as const,
          label: "Resumen",
          visible: hasAnyPermission(permissions, ["admin.tenant.read", "admin.tenant.write"]),
          content: <AdminSettingsOverviewTab canManage={permissions.includes("admin.tenant.write")} />,
        },
        {
          key: "audit" as const,
          label: "Auditoria",
          visible: permissions.includes("admin.audit.read"),
          content: <AdminSettingsAuditTab />,
        },
        {
          key: "employees" as const,
          label: "Empleados",
          visible: hasAnyPermission(permissions, ["admin.employees.read", "admin.employees.write"]),
          content: <AdminEmpleadosPage canManage={permissions.includes("admin.employees.write")} />,
        },
        {
          key: "roles" as const,
          label: "Roles",
          visible: hasAnyPermission(permissions, ["admin.roles.read", "admin.roles.write"]),
          content: (
            <TenantRolesManager
              endpoint="/api/admin/roles"
              title="Roles del panel"
              description="Combina el rol base del gobierno con permisos personalizados para este panel."
              emptyLabel="Todavia no hay roles visibles para este equipo."
              canManage={permissions.includes("admin.roles.write")}
            />
          ),
        },
      ].filter((tab) => tab.visible),
    [permissions]
  );

  const requestedTab = searchParams.get("tab");
  const activeTab = tabs.some((tab) => tab.key === requestedTab)
    ? (requestedTab as AdminSettingsTabKey)
    : ((tabs[0]?.key as AdminSettingsTabKey | undefined) ?? null);

  useEffect(() => {
    if (loadingPermissions || !activeTab) {
      return;
    }

    if (searchParams.get("tab") === activeTab) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set("tab", activeTab);
    router.replace(`${pathname}?${nextSearchParams.toString()}`, { scroll: false });
  }, [activeTab, loadingPermissions, pathname, router, searchParams]);

  const handleTabChange = (value: string) => {
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set("tab", value);
    router.replace(`${pathname}?${nextSearchParams.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuracion</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona organizacion, auditoria, empleados y roles del panel administrativo.
        </p>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      {loadingPermissions ? (
        <Card>
          <CardHeader>
            <CardTitle>Configuracion</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Resolviendo permisos y pestañas disponibles...
          </CardContent>
        </Card>
      ) : tabs.length === 0 || !activeTab || !hasAnyPermission(permissions, ADMIN_SETTINGS_NAV_PERMISSIONS) ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            No cuentas con permisos para ver esta seccion de configuracion.
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList
            className="grid h-auto w-full gap-1"
            style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
          >
            {tabs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key} className="py-2">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent key={tab.key} value={tab.key} className="pt-4">
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
