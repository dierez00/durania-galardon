"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { SanitarioBadge } from "@/modules/bovinos/presentation";
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
import {
  createMvzRanchVaccination,
  deleteMvzRanchVaccination,
  fetchMvzRanchAnimals,
  fetchMvzRanchVaccinations,
  updateMvzRanchVaccination,
} from "./mvzRanchApi";
import { formatDate } from "./formatters";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  MetricCard,
  PrimaryActionButton,
  SectionHeading,
} from "./shared";
import { useAutoOpenCreateAction } from "./useAutoOpenCreateAction";
import type { MvzRanchAnimalRecord, MvzRanchTabProps, MvzRanchVaccinationRecord } from "./types";

interface VaccinationFormState {
  id?: string;
  animalId: string;
  vaccineName: string;
  dose: string;
  status: MvzRanchVaccinationRecord["status"];
  appliedAt: string;
  dueAt: string;
  notes: string;
}

function getInitialForm(record?: MvzRanchVaccinationRecord): VaccinationFormState {
  return {
    id: record?.id,
    animalId: record?.animal_id ?? "",
    vaccineName: record?.vaccine_name ?? "",
    dose: record?.dose ?? "",
    status: record?.status ?? "pending",
    appliedAt: record?.applied_at?.slice(0, 10) ?? "",
    dueAt: record?.due_at?.slice(0, 10) ?? "",
    notes: record?.notes ?? "",
  };
}

export function MvzRanchVaccinationView({
  uppId,
  refreshKey,
}: Readonly<MvzRanchTabProps>) {
  const [vaccinations, setVaccinations] = useState<MvzRanchVaccinationRecord[]>([]);
  const [animals, setAnimals] = useState<MvzRanchAnimalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<MvzRanchVaccinationRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<MvzRanchVaccinationRecord | null>(null);
  const [form, setForm] = useState<VaccinationFormState>(getInitialForm());
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const openCreateDialog = useCallback(() => {
    setForm(getInitialForm());
    setFormError("");
    setDialogOpen(true);
  }, []);

  useAutoOpenCreateAction(openCreateDialog);

  const loadData = async () => {
    const [vaccinationData, animalData] = await Promise.all([
      fetchMvzRanchVaccinations(uppId),
      fetchMvzRanchAnimals(uppId),
    ]);
    setVaccinations(vaccinationData.vaccinations);
    setAnimals(animalData.animals);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [vaccinationData, animalData] = await Promise.all([
          fetchMvzRanchVaccinations(uppId),
          fetchMvzRanchAnimals(uppId),
        ]);
        if (!cancelled) {
          setVaccinations(vaccinationData.vaccinations);
          setAnimals(animalData.animals);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "No fue posible cargar vacunaciones.");
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
      pending: vaccinations.filter((vaccination) => vaccination.status === "pending").length,
      applied: vaccinations.filter((vaccination) => vaccination.status === "applied").length,
      overdue: vaccinations.filter((vaccination) => vaccination.status === "overdue").length,
    }),
    [vaccinations]
  );

  const handleSubmit = async () => {
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        id: form.id,
        animalId: form.animalId,
        vaccineName: form.vaccineName,
        dose: form.dose || undefined,
        status: form.status,
        appliedAt: form.appliedAt || undefined,
        dueAt: form.dueAt || undefined,
        notes: form.notes || undefined,
      };

      if (form.id) {
        await updateMvzRanchVaccination(uppId, payload);
      } else {
        await createMvzRanchVaccination(uppId, payload);
      }

      await loadData();
      setDialogOpen(false);
    } catch (nextError) {
      setFormError(nextError instanceof Error ? nextError.message : "No fue posible guardar la vacunación.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRecord) {
      return;
    }

    try {
      await deleteMvzRanchVaccination(uppId, deleteRecord.id);
      await loadData();
      setDeleteRecord(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No fue posible eliminar la vacunación.");
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Vacunación"
        description="Agenda y seguimiento del esquema vacunal de los animales del rancho."
        actions={<PrimaryActionButton label="Añadir vacunación" onClick={openCreateDialog} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Registros" value={vaccinations.length} />
        <MetricCard label="Pendientes" value={metrics.pending} />
        <MetricCard label="Aplicadas" value={metrics.applied} />
        <MetricCard label="Vencidas" value={metrics.overdue} />
      </div>

      {error ? <ErrorState message={error} /> : null}
      {loading ? <LoadingState label="Cargando vacunaciones..." /> : null}

      {!loading && !error && vaccinations.length === 0 ? (
        <EmptyState
          title="Sin vacunaciones registradas"
          description="Captura dosis nuevas o actualiza el calendario vacunal desde esta vista."
        />
      ) : null}

      {!loading && !error && vaccinations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Plan vacunal</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vacuna</TableHead>
                  <TableHead>Animal</TableHead>
                  <TableHead>Dosis</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Aplicada</TableHead>
                  <TableHead>Próxima</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vaccinations.map((vaccination) => (
                  <TableRow key={vaccination.id}>
                    <TableCell className="font-medium">{vaccination.vaccine_name}</TableCell>
                    <TableCell>{animalNameMap.get(vaccination.animal_id) ?? vaccination.animal_id}</TableCell>
                    <TableCell>{vaccination.dose || "—"}</TableCell>
                    <TableCell>
                      <SanitarioBadge estado={vaccination.status} />
                    </TableCell>
                    <TableCell>{formatDate(vaccination.applied_at)}</TableCell>
                    <TableCell>{formatDate(vaccination.due_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setDetailRecord(vaccination)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setForm(getInitialForm(vaccination));
                            setFormError("");
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteRecord(vaccination)}>
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
            <DialogTitle>{form.id ? "Editar vacunación" : "Nueva vacunación"}</DialogTitle>
            <DialogDescription>
              Asigna animal, estado de dosis y próximas fechas del esquema.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vaccination-animal">Animal</Label>
              <select
                id="vaccination-animal"
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
              <Label htmlFor="vaccination-name">Vacuna</Label>
              <Input
                id="vaccination-name"
                value={form.vaccineName}
                onChange={(event) => setForm((prev) => ({ ...prev, vaccineName: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vaccination-dose">Dosis</Label>
              <Input
                id="vaccination-dose"
                value={form.dose}
                onChange={(event) => setForm((prev) => ({ ...prev, dose: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vaccination-status">Estado</Label>
              <select
                id="vaccination-status"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    status: event.target.value as VaccinationFormState["status"],
                  }))
                }
              >
                <option value="pending">Pendiente</option>
                <option value="applied">Aplicada</option>
                <option value="overdue">Vencida</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vaccination-applied">Aplicada</Label>
              <Input
                id="vaccination-applied"
                type="date"
                value={form.appliedAt}
                onChange={(event) => setForm((prev) => ({ ...prev, appliedAt: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vaccination-due">Próxima dosis</Label>
              <Input
                id="vaccination-due"
                type="date"
                value={form.dueAt}
                onChange={(event) => setForm((prev) => ({ ...prev, dueAt: event.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="vaccination-notes">Notas</Label>
              <Textarea
                id="vaccination-notes"
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
            <Button
              onClick={handleSubmit}
              disabled={!form.animalId || !form.vaccineName.trim() || saving}
            >
              {saving ? "Guardando..." : form.id ? "Guardar cambios" : "Crear vacunación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailRecord !== null} onOpenChange={(open) => !open && setDetailRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detailRecord?.vaccine_name}</DialogTitle>
            <DialogDescription>
              Animal: {detailRecord ? animalNameMap.get(detailRecord.animal_id) ?? detailRecord.animal_id : ""}
            </DialogDescription>
          </DialogHeader>
          {detailRecord ? (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <SanitarioBadge estado={detailRecord.status} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Dosis</p>
                  <p>{detailRecord.dose || "Sin dato"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Aplicada</p>
                  <p>{formatDate(detailRecord.applied_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Próxima dosis</p>
                  <p>{formatDate(detailRecord.due_at)}</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">Notas</p>
                <p>{detailRecord.notes || "Sin notas"}</p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteRecord !== null} onOpenChange={(open) => !open && setDeleteRecord(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar vacunación</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción quitará el registro seleccionado del esquema vacunal del rancho.
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
