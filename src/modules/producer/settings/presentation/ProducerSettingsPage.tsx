"use client";

import { useEffect, useMemo, useState } from "react";
import { TenantRolesManager } from "@/modules/iam";
import ProducerEmpleadosPage from "@/modules/producer/empleados/presentation/ProducerEmpleadosPage";
import { useTenantWorkspace } from "@/modules/workspace";
import { Card, CardContent } from "@/shared/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import ProducerSettingsProfileTab from "./ProducerSettingsProfileTab";
import ProducerSettingsRanchosTab from "./ProducerSettingsRanchosTab";

type ProducerSettingsTabKey = "profile" | "ranchos" | "employees" | "roles";

function hasAnyPermission(permissions: string[], expected: string[]) {
  return expected.some((permission) => permissions.includes(permission));
}

export default function ProducerSettingsPage() {
  const workspace = useTenantWorkspace();
  const permissions = workspace.user?.permissions ?? [];

  const tabs = useMemo(
    () =>
      [
        {
          key: "profile" as const,
          label: "Perfil",
          visible: hasAnyPermission(permissions, ["producer.tenant.read", "producer.tenant.write"]),
          content: <ProducerSettingsProfileTab />,
        },
        {
          key: "ranchos" as const,
          label: "Ranchos",
          visible: hasAnyPermission(permissions, [
            "producer.upp.read",
            "producer.upp.write",
            "producer.employees.read",
            "producer.employees.write",
          ]),
          content: <ProducerSettingsRanchosTab />,
        },
        {
          key: "employees" as const,
          label: "Equipo",
          visible: hasAnyPermission(permissions, ["producer.employees.read", "producer.employees.write"]),
          content: (
            <ProducerEmpleadosPage
              title="Equipo"
              description="Altas, cambios de rol, suspensiones y acceso inicial para personal operativo y MVZ interno. El MVZ interno entra por el panel MVZ."
              canManage={permissions.includes("producer.employees.write")}
            />
          ),
        },
        {
          key: "roles" as const,
          label: "Roles",
          visible: hasAnyPermission(permissions, ["producer.roles.read", "producer.roles.write"]),
          content: (
            <TenantRolesManager
              endpoint="/api/producer/roles"
              title="Roles del equipo"
              description="Combina roles base con permisos personalizados para este panel."
              emptyLabel="Todavía no hay roles visibles para este equipo."
              canManage={permissions.includes("producer.roles.write")}
            />
          ),
        },
      ].filter((tab) => tab.visible),
    [permissions]
  );

  const [activeTab, setActiveTab] = useState<ProducerSettingsTabKey | null>(
    (tabs[0]?.key as ProducerSettingsTabKey | undefined) ?? null
  );

  useEffect(() => {
    if (!tabs.some((tab) => tab.key === activeTab)) {
      setActiveTab((tabs[0]?.key as ProducerSettingsTabKey | undefined) ?? null);
    }
  }, [activeTab, tabs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Datos de la organización productora, ranchos, equipo y roles disponibles en este panel.
        </p>
      </div>

      {tabs.length === 0 || !activeTab ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            No cuentas con permisos para ver esta sección de configuración.
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ProducerSettingsTabKey)}>
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
