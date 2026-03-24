"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import {
  createMvzRanchIncident,
  deleteMvzRanchIncident,
  fetchMvzRanchAnimals,
  fetchMvzRanchIncidents,
  updateMvzRanchIncident,
} from "./mvzRanchApi";
import { formatDateTime } from "./formatters";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  MetricCard,
  PrimaryActionButton,
  SectionHeading,
  ViewModeToggle,
} from "./shared";
import { IncidentSeverityBadge, IncidentStatusBadge } from "./incidentBadges";
import { useAutoOpenCreateAction } from "./useAutoOpenCreateAction";
import { useSessionViewMode } from "./useSessionViewMode";
import type { MvzRanchAnimalRecord, MvzRanchIncidentRecord, MvzRanchTabProps } from "./types";

interface IncidentFormState {
  id?: string;
  animalId: string;
  incidentType: string;
  severity: MvzRanchIncidentRecord["severity"];
  status: MvzRanchIncidentRecord["status"];
  detectedAt: string;
  resolvedAt: string;
  description: string;
  resolutionNotes: string;
}

function getInitialForm(record?: MvzRanchIncidentRecord): IncidentFormState {
  return {
    id: record?.id,
    animalId: record?.animal_id ?? "",
    incidentType: record?.incident_type ?? "",
    severity: record?.severity ?? "medium",
    status: record?.status ?? "open",
    detectedAt: record?.detected_at ? new Date(record.detected_at).toISOString().slice(0, 16) : "",
    resolvedAt: record?.resolved_at ? new Date(record.resolved_at).toISOString().slice(0, 16) : "",
    description: record?.description ?? "",
    resolutionNotes: record?.resolution_notes ?? "",
  };
}

export function MvzRanchIncidentsView({
  uppId,
  refreshKey,
}: Readonly<MvzRanchTabProps>) {
  const [incidents, setIncidents] = useState<MvzRanchIncidentRecord[]>([]);
  const [animals, setAnimals] = useState<MvzRanchAnimalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<MvzRanchIncidentRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<MvzRanchIncidentRecord | null>(null);
  const [form, setForm] = useState<IncidentFormState>(getInitialForm());
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const { viewMode, setViewMode } = useSessionViewMode(`mvz:ranch:${uppId}:incidencias:view`);

  const openCreateDialog = useCallback(() => {
    setForm(getInitialForm());
    setFormError("");
    setDialogOpen(true);
  }, []);

  useAutoOpenCreateAction(openCreateDialog);

  const loadData = async () => {
    const [incidentData, animalData] = await Promise.all([
      fetchMvzRanchIncidents(uppId),
      fetchMvzRanchAnimals(uppId),
    ]);
    setIncidents(incidentData.incidents);
    setAnimals(animalData.animals);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [incidentData, animalData] = await Promise.all([
          fetchMvzRanchIncidents(uppId),
          fetchMvzRanchAnimals(uppId),
        ]);
        if (!cancelled) {
          setIncidents(incidentData.incidents);
          setAnimals(animalData.animals);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "No fue posible cargar incidencias.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, uppId]);

  const animalNameMap = useMemo(
    () => new Map(animals.map((animal) => [animal.animal_id, animal.siniiga_tag])),
    [animals]
  );

  const metrics = useMemo(
    () => ({
      open: incidents.filter((incident) => incident.status === "open").length,
      inProgress: incidents.filter((incident) => incident.status === "in_progress").length,
      resolved: incidents.filter((incident) => incident.status === "resolved").length,
    }),
    [incidents]
  );

  const handleSubmit = async () => {
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        id: form.id,
        animalId: form.animalId,
        incidentType: form.incidentType,
        severity: form.severity,
        status: form.status,
        detectedAt: form.detectedAt ? new Date(form.detectedAt).toISOString() : undefined,
        resolvedAt: form.resolvedAt ? new Date(form.resolvedAt).toISOString() : undefined,
        description: form.description || undefined,
        resolutionNotes: form.resolutionNotes || undefined,
      };

      if (form.id) {
        await updateMvzRanchIncident(uppId, payload);
      } else {
        await createMvzRanchIncident(uppId, payload);
      }

      await loadData();
      setDialogOpen(false);
    } catch (nextError) {
      setFormError(nextError instanceof Error ? nextError.message : "No fue posible guardar la incidencia.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRecord) {
      return;
    }

    try {
      await deleteMvzRanchIncident(uppId, deleteRecord.id);
      await loadData();
      setDeleteRecord(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No fue posible eliminar la incidencia.");
    }
  };

  const renderActions = (record: MvzRanchIncidentRecord) => (
    <div className="flex items-center justify-end gap-1">
      <Button size="icon" variant="ghost" onClick={() => setDetailRecord(record)}>
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => {
          setForm(getInitialForm(record));
          setFormError("");
          setDialogOpen(true);
        }}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" onClick={() => setDeleteRecord(record)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Incidencias"
        description="Registro, seguimiento y resolución de eventos sanitarios detectados en el rancho."
        actions={
          <>
            <ViewModeToggle mode={viewMode} onChange={setViewMode} />
            <PrimaryActionButton label="Añadir incidencia" onClick={openCreateDialog} />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total" value={incidents.length} />
        <MetricCard label="Abiertas" value={metrics.open} />
        <MetricCard label="En seguimiento" value={metrics.inProgress} />
        <MetricCard label="Resueltas" value={metrics.resolved} />
      </div>

      {error ? <ErrorState message={error} /> : null}
      {loading ? <LoadingState label="Cargando incidencias..." /> : null}

      {!loading && !error && incidents.length === 0 ? (
        <EmptyState
          title="Sin incidencias registradas"
          description="Usa el botón de alta para capturar la primera incidencia del rancho."
        />
      ) : null}

      {!loading && !error && incidents.length > 0 && viewMode === "card" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {incidents.map((incident) => (
            <Card key={incident.id}>
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{incident.incident_type}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Animal: {animalNameMap.get(incident.animal_id) ?? incident.animal_id}
                    </p>
                  </div>
                  {renderActions(incident)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <IncidentSeverityBadge severity={incident.severity} />
                  <IncidentStatusBadge status={incident.status} />
                </div>
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">Detectada</p>
                    <p className="font-medium">{formatDateTime(incident.detected_at)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Resuelta</p>
                    <p className="font-medium">{formatDateTime(incident.resolved_at)}</p>
                  </div>
                </div>
                {incident.description ? (
                  <p className="text-sm text-muted-foreground">{incident.description}</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {!loading && !error && incidents.length > 0 && viewMode === "table" ? (
        <Card>
          <CardHeader>
            <CardTitle>Tabla de incidencias</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Animal</TableHead>
                  <TableHead>Severidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Detectada</TableHead>
                  <TableHead>Resuelta</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell className="font-medium">{incident.incident_type}</TableCell>
                    <TableCell>{animalNameMap.get(incident.animal_id) ?? incident.animal_id}</TableCell>
                    <TableCell>
                      <IncidentSeverityBadge severity={incident.severity} />
                    </TableCell>
                    <TableCell>
                      <IncidentStatusBadge status={incident.status} />
                    </TableCell>
                    <TableCell>{formatDateTime(incident.detected_at)}</TableCell>
                    <TableCell>{formatDateTime(incident.resolved_at)}</TableCell>
                    <TableCell>{renderActions(incident)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar incidencia" : "Nueva incidencia"}</DialogTitle>
            <DialogDescription>
              Captura la severidad, el animal asociado y el seguimiento operativo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="incident-animal">Animal</Label>
              <select
                id="incident-animal"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={form.animalId}
                onChange={(event) => setForm((prev) => ({ ...prev, animalId: event.target.value }))}
              >
                <option value="">Selecciona un animal</option>
                {animals.map((animal) => (
                  <option key={animal.animal_id} value={animal.animal_id}>
                    {animal.siniiga_tag}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="incident-type">Tipo</Label>
              <Input
                id="incident-type"
                value={form.incidentType}
                onChange={(event) => setForm((prev) => ({ ...prev, incidentType: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="incident-severity">Severidad</Label>
              <select
                id="incident-severity"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={form.severity}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    severity: event.target.value as IncidentFormState["severity"],
                  }))
                }
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="incident-status">Estado</Label>
              <select
                id="incident-status"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    status: event.target.value as IncidentFormState["status"],
                  }))
                }
              >
                <option value="open">Abierta</option>
                <option value="in_progress">En seguimiento</option>
                <option value="resolved">Resuelta</option>
                <option value="dismissed">Descartada</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="incident-detected">Detectada</Label>
              <Input
                id="incident-detected"
                type="datetime-local"
                value={form.detectedAt}
                onChange={(event) => setForm((prev) => ({ ...prev, detectedAt: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="incident-resolved">Resuelta</Label>
              <Input
                id="incident-resolved"
                type="datetime-local"
                value={form.resolvedAt}
                onChange={(event) => setForm((prev) => ({ ...prev, resolvedAt: event.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="incident-description">Descripción</Label>
              <Textarea
                id="incident-description"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="incident-resolution">Notas de resolución</Label>
              <Textarea
                id="incident-resolution"
                value={form.resolutionNotes}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, resolutionNotes: event.target.value }))
                }
              />
            </div>
          </div>
          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.animalId || !form.incidentType.trim() || saving}
            >
              {saving ? "Guardando..." : form.id ? "Guardar cambios" : "Crear incidencia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailRecord !== null} onOpenChange={(open) => !open && setDetailRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detailRecord?.incident_type}</DialogTitle>
            <DialogDescription>
              Animal: {detailRecord ? animalNameMap.get(detailRecord.animal_id) ?? detailRecord.animal_id : ""}
            </DialogDescription>
          </DialogHeader>
          {detailRecord ? (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <IncidentSeverityBadge severity={detailRecord.severity} />
                <IncidentStatusBadge status={detailRecord.status} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Detectada</p>
                  <p>{formatDateTime(detailRecord.detected_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Resuelta</p>
                  <p>{formatDateTime(detailRecord.resolved_at)}</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">Descripción</p>
                <p>{detailRecord.description || "Sin descripción"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Resolución</p>
                <p>{detailRecord.resolution_notes || "Sin notas de resolución"}</p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteRecord !== null} onOpenChange={(open) => !open && setDeleteRecord(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar incidencia</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción quitará la incidencia del historial del rancho.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
