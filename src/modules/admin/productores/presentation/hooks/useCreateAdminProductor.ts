"use client";

import { useState } from "react";
import { createProductorUseCase } from "@/modules/admin/productores/infra/container";

interface UseCreateAdminProductorOptions {
  /** Callback ejecutado tras un alta exitosa (p.ej. recargar la lista) */
  onSuccess?: () => void | Promise<void>;
}

export function useCreateAdminProductor({
  onSuccess,
}: UseCreateAdminProductorOptions = {}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [curp, setCurp] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const handleCreate = async () => {
    setCreating(true);
    setCreateError("");
    try {
      await createProductorUseCase.execute({
        email,
        password,
        fullName,
        curp: curp.trim() || undefined,
      });
      setEmail("");
      setPassword("");
      setFullName("");
      setCurp("");
      await onSuccess?.();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Error al crear productor.");
    } finally {
      setCreating(false);
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    fullName,
    setFullName,
    curp,
    setCurp,
    creating,
    createError,
    handleCreate,
  };
}
