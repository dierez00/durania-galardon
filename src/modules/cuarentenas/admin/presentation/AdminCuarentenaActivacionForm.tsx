"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { useAdminCuarentenaActivacion } from "./hooks/useAdminCuarentenaActivacion";

interface Props {
  onSuccess?: () => void;
  /** Cuando se provee externamente, el formulario se controla desde fuera */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AdminCuarentenaActivacionForm({
  onSuccess,
  open: openProp,
  onOpenChange,
}: Readonly<Props>) {
  const {
    upps,
    uppsLoading,
    form,
    updateForm,
    selectedUpp,
    saving,
    saveError,
    isValid,
    handleSubmit,
    resetForm,
  } = useAdminCuarentenaActivacion(onSuccess);

  const controlled = openProp !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlled ? openProp : internalOpen;
  const setOpen = (v: boolean) => {
    if (!controlled) setInternalOpen(v);
    onOpenChange?.(v);
  };

  if (!open) {
    // Modo no controlado: muestra el botón de activación aquí mismo
    if (controlled) return null;
    return (
      <Button
        onClick={() => { setOpen(true); }}
        className="w-full sm:w-auto"
      >
        + Activar cuarentena
      </Button>
    );
  }

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Activar nueva cuarentena</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">

        {/* Tipo */}
        <div className="space-y-1">
          <Label htmlFor="act-type">Tipo de cuarentena</Label>
          <Select
            value={form.quarantineType}
            onValueChange={(v) => updateForm("quarantineType", v as "state" | "operational")}
          >
            <SelectTrigger id="act-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="state">Estatal</SelectItem>
              <SelectItem value="operational">Operacional</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Rancho */}
        <div className="space-y-1">
          <Label htmlFor="act-upp">Rancho (UPP)</Label>
          {uppsLoading ? (
            <p className="text-xs text-muted-foreground py-2">Cargando ranchos…</p>
          ) : (
            <Select
              value={form.uppId || "none"}
              onValueChange={(v) => updateForm("uppId", v === "none" ? "" : v)}
            >
              <SelectTrigger id="act-upp">
                <SelectValue placeholder="Sin rancho específico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin rancho específico</SelectItem>
                {upps.map((u) => (
                  <SelectItem key={u.uppId} value={u.uppId}>
                    {u.uppName} — {u.producerName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Preview métricas del rancho seleccionado */}
        {selectedUpp && (
          <div className="md:col-span-2 rounded-md bg-muted px-3 py-2 text-xs space-y-0.5">
            <p className="font-medium">{selectedUpp.uppName} — {selectedUpp.producerName}</p>
            <p>Animales: <span className="font-semibold">{selectedUpp.totalAnimals}</span> total | <span className="text-success font-semibold">{selectedUpp.activeAnimals}</span> activos</p>
            {selectedUpp.hasActiveQuarantine && (
              <p className="text-warning font-semibold">
                ⚠ Ya tiene cuarentena activa: {selectedUpp.activeQuarantineTitle}
              </p>
            )}
          </div>
        )}

        {/* Título */}
        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="act-title">Título <span className="text-destructive">*</span></Label>
          <Input
            id="act-title"
            value={form.title}
            onChange={(e) => updateForm("title", e.target.value)}
            placeholder="Ej. Cuarentena TB Zona Norte"
          />
        </div>

        {/* Razón */}
        <div className="space-y-1">
          <Label htmlFor="act-reason">Motivo / razón</Label>
          <Textarea
            id="act-reason"
            rows={2}
            value={form.reason}
            onChange={(e) => updateForm("reason", e.target.value)}
            placeholder="Brote detectado en…"
          />
        </div>

        {/* Nota epidemiológica */}
        <div className="space-y-1">
          <Label htmlFor="act-epi">Nota epidemiológica</Label>
          <Textarea
            id="act-epi"
            rows={2}
            value={form.epidemiologicalNote}
            onChange={(e) => updateForm("epidemiologicalNote", e.target.value)}
            placeholder="Información adicional de seguimiento…"
          />
        </div>

        {/* Errores */}
        {saveError && (
          <p className="md:col-span-2 text-sm text-destructive">{saveError}</p>
        )}

        {/* Acciones */}
        <div className="md:col-span-2 flex gap-2 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { resetForm(); setOpen(false); }}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={() => void handleSubmit()}
            disabled={!isValid || saving}
          >
            {saving ? "Guardando…" : "Activar cuarentena"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
