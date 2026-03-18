"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getActivationContextUseCase,
  createCuarentenaUseCase,
} from "@/modules/cuarentenas/admin/infra/container";
import type { AdminCuarentenaActivationContextItem } from "@/modules/cuarentenas/admin/domain/entities/AdminCuarentenaDetailEntity";
import type { AdminCuarentenaType } from "@/modules/cuarentenas/admin/domain/entities/AdminCuarentenaEntity";

export interface CuarentenaActivacionForm {
  quarantineType: AdminCuarentenaType;
  uppId: string;
  title: string;
  reason: string;
  epidemiologicalNote: string;
}

const EMPTY_FORM: CuarentenaActivacionForm = {
  quarantineType: "state",
  uppId: "",
  title: "",
  reason: "",
  epidemiologicalNote: "",
};

export function useAdminCuarentenaActivacion(onSuccess?: () => void) {
  // â”€â”€ Contexto de activaciÃ³n â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [upps, setUpps]               = useState<AdminCuarentenaActivationContextItem[]>([]);
  const [uppsLoading, setUppsLoading] = useState(true);
  const [uppsError, setUppsError]     = useState("");

  useEffect(() => {
    void (async () => {
      setUppsLoading(true);
      setUppsError("");
      try {
        const items = await getActivationContextUseCase.execute();
        setUpps(items);
      } catch (err) {
        setUppsError(err instanceof Error ? err.message : "Error al cargar contexto.");
      } finally {
        setUppsLoading(false);
      }
    })();
  }, []);

  // â”€â”€ Formulario â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [form, setForm] = useState<CuarentenaActivacionForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const selectedUpp = upps.find((u) => u.uppId === form.uppId) ?? null;

  const updateForm = useCallback(
    <K extends keyof CuarentenaActivacionForm>(key: K, value: CuarentenaActivacionForm[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!form.title.trim()) {
      setSaveError("El tÃ­tulo es obligatorio.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      await createCuarentenaUseCase.execute({
        title:               form.title.trim(),
        uppId:               form.uppId.trim() || undefined,
        quarantineType:      form.quarantineType,
        reason:              form.reason.trim() || undefined,
        epidemiologicalNote: form.epidemiologicalNote.trim() || undefined,
      });
      setForm(EMPTY_FORM);
      onSuccess?.();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Error al crear cuarentena.");
    } finally {
      setSaving(false);
    }
  }, [form, onSuccess]);

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setSaveError("");
  }, []);

  const isValid = form.title.trim().length > 0;

  return {
    upps,
    uppsLoading,
    uppsError,
    form,
    updateForm,
    selectedUpp,
    saving,
    saveError,
    isValid,
    handleSubmit,
    resetForm,
  };
}

