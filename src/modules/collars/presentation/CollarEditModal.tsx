"use client";

import { useEffect, useState, useCallback } from "react";
import { listProducerOptions } from "@/modules/admin/productores/application/services";
import { updateAdminCollar } from "@/modules/collars/application/services";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
} from "@/shared/ui";
import type { CollarListItem, ProducerListItem } from "./types";

const ADMIN_STATUS_OPTIONS = [
  { value: "inactive", label: "Inactivo" },
  { value: "active", label: "Activo" },
  { value: "suspended", label: "Suspendido" },
  { value: "retired", label: "Retirado" },
] as const;

const ASSIGNED_STATUS_OPTIONS = [
  { value: "suspended", label: "Suspendido" },
  { value: "retired", label: "Retirado" },
] as const;

const UNCHANGED_STATUS_VALUE = "__unchanged__";
const UNASSIGNED_PRODUCER_VALUE = "__none__";

function normalizeCollarIdInput(value: string): string {
  return value.toUpperCase().replace(/\s+/g, "");
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collar: CollarListItem | null;
  onSaved?: () => void;
}

export function CollarEditModal({ open, onOpenChange, collar, onSaved }: Readonly<Props>) {
  const [producers, setProducers] = useState<ProducerListItem[]>([]);
  const [loadingProducers, setLoadingProducers] = useState(false);
  const [collarId, setCollarId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("inactive");
  const [selectedProducerId, setSelectedProducerId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const fetchProducers = async () => {
      try {
        setLoadingProducers(true);

        const body = await listProducerOptions();
        setProducers(body);
      } catch (err) {
        console.error("Error fetching producers", err);
      } finally {
        setLoadingProducers(false);
      }
    };

    fetchProducers();
  }, [open]);

  useEffect(() => {
    if (open && collar) {
      setCollarId(collar.collar_id ?? "");
      const isAssigned = Boolean(collar.producer_id);
      if (isAssigned && !ASSIGNED_STATUS_OPTIONS.some((option) => option.value === collar.status)) {
        setSelectedStatus(UNCHANGED_STATUS_VALUE);
      } else {
        setSelectedStatus(collar.status);
      }
      setSelectedProducerId(collar.producer_id || UNASSIGNED_PRODUCER_VALUE);
      setError(null);
    }
  }, [open, collar]);

  const handleClose = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setError(null);
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange]
  );

  const handleSave = useCallback(async () => {
    if (!collar) return;

    const isAssigned = Boolean(collar.producer_id);

    const normalizedCollarId = normalizeCollarIdInput(collarId);
    if (!/^[A-Z]+-[0-9]{3,}$/.test(normalizedCollarId)) {
      setError("El collar ID debe estar en mayúsculas con formato tipo COLLAR-004.");
      return;
    }

    if (isAssigned && selectedProducerId !== collar.producer_id) {
      setError("Este collar ya está asignado y no puede reasignarse a otro productor.");
      return;
    }

    const allowedOptions = isAssigned ? ASSIGNED_STATUS_OPTIONS : ADMIN_STATUS_OPTIONS;
    const isUnchanged = selectedStatus === UNCHANGED_STATUS_VALUE;
    const shouldSendStatus = !isUnchanged && selectedStatus !== collar.status;

    if (!isUnchanged && !allowedOptions.some((option) => option.value === selectedStatus)) {
      setError("Selecciona un estado administrativo válido.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const normalizedProducerId =
        selectedProducerId === UNASSIGNED_PRODUCER_VALUE ? "" : selectedProducerId;

      await updateAdminCollar(collar.id, {
        collar_id: normalizedCollarId,
        status: shouldSendStatus
          ? (selectedStatus as "inactive" | "active" | "suspended" | "retired")
          : undefined,
        producer_id: normalizedProducerId || undefined,
      });

      onSaved?.();
      handleClose(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar collar");
    } finally {
      setSaving(false);
    }
  }, [collar, collarId, selectedProducerId, selectedStatus, handleClose, onSaved]);

  if (!collar) return null;

  const isAssigned = Boolean(collar.producer_id);
  const statusOptions = isAssigned ? ASSIGNED_STATUS_OPTIONS : ADMIN_STATUS_OPTIONS;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-105">
        <DialogHeader>
          <DialogTitle>Editar collar</DialogTitle>
          <DialogDescription>
            Administra productor, estado y Collar ID. Al asignar productor por primera vez se
            registra fecha de compra.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit_collar_id">Collar ID</Label>
            <Input
              id="edit_collar_id"
              value={collarId}
              onChange={(event) => setCollarId(normalizeCollarIdInput(event.target.value))}
              disabled={saving}
              placeholder="COLLAR-004"
              className="font-mono"
            />
            <p className="text-xs text-amber-700">
              Advertencia: cambiar el Collar ID impacta trazabilidad y debe conservar formato
              COLLAR-004.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_status">Estado administrativo</Label>
            <Select
              value={selectedStatus}
              onValueChange={setSelectedStatus}
              disabled={saving}
            >
              <SelectTrigger id="edit_status">
                <SelectValue placeholder="Selecciona estado..." />
              </SelectTrigger>
              <SelectContent>
                {isAssigned && (
                  <SelectItem value={UNCHANGED_STATUS_VALUE}>Sin cambio</SelectItem>
                )}
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-amber-700">
              {isAssigned
                ? "Advertencia: al estar asignado, sólo puede pasar a Suspendido o Retirado."
                : "Advertencia: los cambios de estado son auditados y aplican reglas de transición."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_producer_id">Productor</Label>
            <Select
              value={selectedProducerId}
              onValueChange={setSelectedProducerId}
              disabled={saving || loadingProducers || isAssigned}
            >
              <SelectTrigger id="edit_producer_id">
                <SelectValue placeholder="Selecciona un productor..." />
              </SelectTrigger>
              <SelectContent>
                {!isAssigned && (
                  <SelectItem value={UNASSIGNED_PRODUCER_VALUE}>Sin asignar</SelectItem>
                )}
                {producers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-amber-700">
              {isAssigned
                ? "Advertencia: este collar ya está asignado y no puede reasignarse a otro productor."
                : "Advertencia: cambiar productor asigna ownership del collar."}
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
