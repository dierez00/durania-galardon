"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useTenantWorkspace } from "@/modules/workspace";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";

export default function MvzProjectsPage() {
  const router = useRouter();
  const workspace = useTenantWorkspace();
  const [search, setSearch] = useState("");
  const isMvzInternal = workspace.user?.isMvzInternal ?? false;

  const filteredProjects = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return workspace.projects;
    }

    return workspace.projects.filter((project) => {
      const haystack = [
        project.name,
        project.code,
        project.producerName,
        project.status,
        project.sanitaryAlert,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [search, workspace.projects]);

  useEffect(() => {
    if (!isMvzInternal || workspace.projects.length !== 1) {
      return;
    }

    router.replace(`/mvz/ranchos/${workspace.projects[0].id}`);
  }, [isMvzInternal, router, workspace.projects]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {isMvzInternal ? "Selecciona tu rancho" : "Ranchos asignados"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isMvzInternal
            ? "Accede directamente al rancho que tienes asignado en este tenant MVZ."
            : "Espacio organizacional para revisar y abrir los ranchos bajo tu cobertura MVZ."}
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar rancho, productor o codigo UPP..."
          className="pl-9"
        />
      </div>

      {isMvzInternal ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ranchos disponibles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredProjects.map((project) => (
              <button
                key={project.id}
                onClick={() => workspace.navigateToProject(project.id)}
                className="flex w-full items-center justify-between rounded-lg border p-4 text-left transition hover:border-primary/40 hover:bg-muted/40"
              >
                <div className="space-y-1">
                  <p className="font-medium">{project.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {project.producerName ?? "Sin productor"}
                    {project.code ? ` | ${project.code}` : ""}
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">Abrir</span>
              </button>
            ))}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredProjects.map((project) => (
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
                    Ultima asignacion:{" "}
                    {project.assignedAt
                      ? new Date(project.assignedAt).toLocaleDateString("es-MX")
                      : "Sin registro"}
                  </p>
                </div>
                <Button onClick={() => workspace.navigateToProject(project.id)}>
                  Abrir proyecto
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            No se encontraron ranchos con los filtros actuales.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
