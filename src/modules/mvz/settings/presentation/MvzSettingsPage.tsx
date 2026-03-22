"use client";

import { useEffect, useMemo, useState } from "react";
import { TenantRolesManager } from "@/modules/iam";
import MvzMembersPage from "@/modules/mvz/members/presentation/MvzMembersPage";
import { useTenantWorkspace } from "@/modules/workspace";
import { Card, CardContent } from "@/shared/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import MvzSettingsProfileTab from "./MvzSettingsProfileTab";
import MvzSettingsRanchosTab from "./MvzSettingsRanchosTab";

type MvzSettingsTabKey = "profile" | "ranchos" | "team" | "roles";

function hasAnyPermission(permissions: string[], expected: string[]) {
  return expected.some((permission) => permissions.includes(permission));
}

export default function MvzSettingsPage() {
  const workspace = useTenantWorkspace();
  const permissions = workspace.user?.permissions ?? [];

  const tabs = useMemo(
    () =>
      [
        {
          key: "profile" as const,
          label: "Perfil",
          visible: hasAnyPermission(permissions, ["mvz.tenant.read", "mvz.tenant.write"]),
          content: <MvzSettingsProfileTab />,
        },
        {
          key: "ranchos" as const,
          label: "Ranchos",
          visible: hasAnyPermission(permissions, ["mvz.assignments.read"]),
          content: <MvzSettingsRanchosTab />,
        },
        {
          key: "team" as const,
          label: "Equipo",
          visible: hasAnyPermission(permissions, ["mvz.members.read", "mvz.members.write"]),
          content: (
            <MvzMembersPage
              title="Equipo MVZ"
              description="Alta, cambio de rol y suspension de miembros del tenant MVZ."
              canManage={permissions.includes("mvz.members.write")}
            />
          ),
        },
        {
          key: "roles" as const,
          label: "Roles",
          visible: hasAnyPermission(permissions, ["mvz.roles.read", "mvz.roles.write"]),
          content: (
            <TenantRolesManager
              endpoint="/api/mvz/roles"
              title="Roles del tenant MVZ"
              description="Administra roles base protegidos, clones y permisos custom para el equipo MVZ."
              emptyLabel="No hay roles visibles para este tenant MVZ."
              canManage={permissions.includes("mvz.roles.write")}
            />
          ),
        },
      ].filter((tab) => tab.visible),
    [permissions]
  );

  const [activeTab, setActiveTab] = useState<MvzSettingsTabKey | null>(
    (tabs[0]?.key as MvzSettingsTabKey | undefined) ?? null
  );

  useEffect(() => {
    if (!tabs.some((tab) => tab.key === activeTab)) {
      setActiveTab((tabs[0]?.key as MvzSettingsTabKey | undefined) ?? null);
    }
  }, [activeTab, tabs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuracion</h1>
        <p className="text-sm text-muted-foreground">
          Perfil del tenant MVZ, ranchos asignados, equipo y roles editables por panel.
        </p>
      </div>

      {tabs.length === 0 || !activeTab ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            No cuentas con permisos para visualizar tabs de configuracion en este panel.
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as MvzSettingsTabKey)}>
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
