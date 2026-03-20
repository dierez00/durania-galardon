"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
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
import { SanitarioBadge } from "@/modules/bovinos/presentation";
import {
  createMvzRanchVisit,
  deleteMvzRanchVisit,
  fetchMvzRanchVisits,
  updateMvzRanchVisit,
} from "./mvzRanchApi";
import { formatDateTime, toDateTimeInputValue } from "./formatters";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  MetricCard,
  PrimaryActionButton,
  SectionHeading,
} from "./shared";
import type { MvzRanchTabProps, MvzRanchVisitRecord } from "./types";

interface VisitFormState {
  id?: string;
  visitType: string;
  status: MvzRanchVisitRecord["status"];
  scheduledAt: string;
  startedAt: string;
  finishedAt: string;
  notes: string;
}

function getInitialForm(record?: MvzRanchVisitRecord): VisitFormState {
  return {
    id: record?.id,
    visitType: record?.visit_type ?? "inspection",
    status: record?.status ?? "scheduled",
    scheduledAt: toDateTimeInputValue(record?.scheduled_at),
    startedAt: toDateTimeInputValue(record?.started_at),
    finishedAt: toDateTimeInputValue(record?.finished_at),
    notes: record?.notes ?? "",
  };
}

export function MvzRanchVisitsView({
  uppId,
  refreshKey,
}: Readonly<MvzRanchTabProps>) {
  const [visits, setVisits] = useState<MvzRanchVisitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<MvzRanchVisitRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<MvzRanchVisitRecord | null>(null);
  const [form, setForm] = useState<VisitFormState>(getInitialForm());
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    const data = await fetchMvzRanchVisits(uppId);
    setVisits(data.visits);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchMvzRanchVisits(uppId);
        if (!cancelled) {
          setVisits(data.visits);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "No fue posible cargar visitas.");
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

  const metrics = useMemo(
    () => ({
      scheduled: visits.filter((visit) => visit.status === "scheduled").length,
      inProgress: visits.filter((visit) => visit.status === "in_progress").length,
      completed: visits.filter((visit) => visit.status === "completed").length,
    }),
    [visits]
  );

  const handleSubmit = async () => {
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        id: form.id,
        visitType: form.visitType,
        status: form.status,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
        startedAt: form.startedAt ? new Date(form.startedAt).toISOString() : undefined,
        finishedAt: form.finishedAt ? new Date(form.finishedAt).toISOString() : undefined,
        notes: form.notes || undefined,
      };

      if (form.id) {
        await updateMvzRanchVisit(uppId, payload);
      } else {
        await createMvzRanchVisit(uppId, payload);
      }

      await loadData();
      setDialogOpen(false);
    } catch (nextError) {
      setFormError(nextError instanceof Error ? nextError.message : "No fue posible guardar la visita.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRecord) {
      return;
    }

    try {
      await deleteMvzRanchVisit(uppId, deleteRecord.id);
      await loadData();
      setDeleteRecord(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No fue posible eliminar la visita.");
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Visitas"
        description="Agenda de visitas MVZ, ejecución en campo y cierre operativo."
        actions={
          <PrimaryActionButton
            label="Añadir visita"
            onClick={() => {
              setForm(getInitialForm());
              setFormError("");
              setDialogOpen(true);
            }}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total" value={visits.length} />
        <MetricCard label="Programadas" value={metrics.scheduled} />
        <MetricCard label="En curso" value={metrics.inProgress} />
        <MetricCard label="Completadas" value={metrics.completed} />
      </div>

      {error ? <ErrorState message={error} /> : null}
      {loading ? <LoadingState label="Cargando visitas..." /> : null}

      {!loading && !error && visits.length === 0 ? (
        <EmptyState
          title="Sin visitas programadas"
          description="Crea la siguiente visita o actualiza el seguimiento de una visita en curso."
        />
      ) : null}

      {!loading && !error && visits.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Agenda de visitas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Programada</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visits.map((visit) => (
                  <TableRow key={visit.id}>
                    <TableCell className="font-medium">{visit.visit_type}</TableCell>
                    <TableCell>
                      <SanitarioBadge estado={visit.status} />
                    </TableCell>
                    <TableCell>{formatDateTime(visit.scheduled_at)}</TableCell>
                    <TableCell>{formatDateTime(visit.started_at)}</TableCell>
                    <TableCell>{formatDateTime(visit.finished_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setDetailRecord(visit)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setForm(getInitialForm(visit));
                            setFormError("");
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteRecord(visit)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
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
            <DialogTitle>{form.id ? "Editar visita" : "Nueva visita"}</DialogTitle>
            <DialogDescription>
              Programa la visita y actualiza su ejecución dentro del rancho.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="visit-type">Tipo</Label>
              <Input
                id="visit-type"
                value={form.visitType}
                onChange={(event) => setForm((prev) => ({ ...prev, visitType: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visit-status">Estado</Label>
              <select
                id="visit-status"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, status: event.target.value as VisitFormState["status"] }))
                }
              >
                <option value="scheduled">Programada</option>
                <option value="in_progress">En progreso</option>
                <option value="completed">Completada</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="visit-scheduled">Programada</Label>
              <Input
                id="visit-scheduled"
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(event) => setForm((prev) => ({ ...prev, scheduledAt: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visit-started">Inicio</Label>
              <Input
                id="visit-started"
                type="datetime-local"
                value={form.startedAt}
                onChange={(event) => setForm((prev) => ({ ...prev, startedAt: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visit-finished">Fin</Label>
              <Input
                id="visit-finished"
                type="datetime-local"
                value={form.finishedAt}
                onChange={(event) => setForm((prev) => ({ ...prev, finishedAt: event.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="visit-notes">Notas</Label>
              <Textarea
                id="visit-notes"
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </div>
          </div>
          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!form.scheduledAt || saving}>
              {saving ? "Guardando..." : form.id ? "Guardar cambios" : "Crear visita"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailRecord !== null} onOpenChange={(open) => !open && setDetailRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detailRecord?.visit_type}</DialogTitle>
            <DialogDescription>{detailRecord?.notes || "Sin notas de visita"}</DialogDescription>
          </DialogHeader>
          {detailRecord ? (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <SanitarioBadge estado={detailRecord.status} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Programada</p>
                  <p>{formatDateTime(detailRecord.scheduled_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Inicio</p>
                  <p>{formatDateTime(detailRecord.started_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fin</p>
                  <p>{formatDateTime(detailRecord.finished_at)}</p>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteRecord !== null} onOpenChange={(open) => !open && setDeleteRecord(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar visita</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción quitará la visita seleccionada del historial del rancho.
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
