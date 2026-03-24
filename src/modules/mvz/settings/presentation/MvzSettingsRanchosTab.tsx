"use client";

import { useTenantWorkspace } from "@/modules/workspace";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export default function MvzSettingsRanchosTab() {
  const workspace = useTenantWorkspace();
  const projects = workspace.projects;

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          No hay ranchos asignados para esta organización MVZ.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Ranchos asignados</h2>
        <p className="text-sm text-muted-foreground">
          Relación de ranchos activos bajo cobertura del equipo MVZ actual.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {projects.map((project) => (
          <Card key={project.id}>
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg">{project.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {project.producerName ?? "Sin productor"} {project.code ? `| ${project.code}` : ""}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <p>Estado: {project.status || "Sin estado"}</p>
                <p>Alerta sanitaria: {project.sanitaryAlert || "Sin alertas"}</p>
                <p>Animales activos: {project.activeAnimals ?? 0}</p>
                <p>
                  Última asignación:{" "}
                  {project.assignedAt
                    ? new Date(project.assignedAt).toLocaleDateString("es-MX")
                    : "Sin registro"}
                </p>
              </div>
              <Button onClick={() => workspace.navigateToProject(project.id)}>
                Abrir rancho
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
