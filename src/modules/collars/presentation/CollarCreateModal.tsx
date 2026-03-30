"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";
import { AlertCircle } from "lucide-react";
import type { useCreateCollar } from "./hooks/useCreateCollar";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  createCollarHook: ReturnType<typeof useCreateCollar>;
}

export function CollarCreateModal({
  open,
  onOpenChange,
  onSuccess,
  createCollarHook: {
    collar_id,
    setCollarId,
    producer_id,
    setProducerId,
    firmware_version,
    setFirmwareVersion,
    creating,
    error,
    producers,
    loadingProducers,
    handleCreate,
    resetForm,
  },
}: Readonly<Props>) {
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async () => {
    await handleCreate();
    if (!error) {
      handleOpenChange(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Collar</DialogTitle>
          <DialogDescription>
            Provisiona un nuevo collar IoT al sistema
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="flex gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="collar_id">Collar ID *</Label>
            <Input
              id="collar_id"
              placeholder="ej: COL-001"
              value={collar_id}
              onChange={(e) => setCollarId(e.target.value)}
              disabled={creating}
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="firmware_version">Firmware Version *</Label>
            <Select
              value={firmware_version}
              onValueChange={setFirmwareVersion}
              disabled={creating}
            >
              <SelectTrigger id="firmware_version">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1.0.0">1.0.0</SelectItem>
                <SelectItem value="1.1.0">1.1.0</SelectItem>
                <SelectItem value="2.0.0">2.0.0</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="producer_id">Productor (opcional)</Label>
            <Select
              value={producer_id || "none"}
              onValueChange={(value) => {
                if (value === "none") {
                  setProducerId("");
                } else {
                  setProducerId(value);
                }
              }}
              disabled={creating || loadingProducers}
            >
              <SelectTrigger id="producer_id">
                <SelectValue placeholder="Selecciona un productor..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {producers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={creating}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={creating || !collar_id}
          >
            {creating ? "Creando..." : "Crear Collar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
