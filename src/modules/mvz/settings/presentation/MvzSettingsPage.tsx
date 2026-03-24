"use client";

import { useEffect, useMemo, useState } from "react";
import { useTenantWorkspace } from "@/modules/workspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import MvzSettingsProfileTab from "./MvzSettingsProfileTab";
import MvzSettingsRanchosTab from "./MvzSettingsRanchosTab";

type MvzSettingsTabKey = "profile" | "ranchos";

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
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Datos de la organización MVZ y ranchos asignados para tu trabajo en campo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gestión de personal</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Las altas del personal MVZ se realizan fuera de este panel. Gobierno da de alta a las
          cuentas con rol MVZ Gobierno y cada productor da de alta a las cuentas con rol MVZ
          Interno.
        </CardContent>
      </Card>

      {tabs.length === 0 || !activeTab ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            No cuentas con permisos para ver esta sección de configuración.
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
