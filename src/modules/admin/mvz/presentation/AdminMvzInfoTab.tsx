"use client";

import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Mail,
  CreditCard,
  CalendarDays,
  Home,
  FlaskConical,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { AdminMvzDetallado } from "@/modules/admin/mvz/domain/entities/AdminMvzDetailEntity";

type EditableField = "fullName" | "email" | "licenseNumber";

interface Props {
  detail: AdminMvzDetallado;
  editingField: EditableField | null;
  isSavingField: boolean;
  fieldError: string | null;
  setEditingField: (field: EditableField | null) => void;
  onFieldErrorClear: () => void;
  onSave: (field: EditableField, value: string) => Promise<void>;
}

interface InfoRowProps {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  rawValue?: string;
  field?: EditableField;
  editingField: EditableField | null;
  isSavingField: boolean;
  fieldError?: string | null;
  onEdit?: (field: EditableField) => void;
  onSave?: (field: EditableField, value: string) => void;
  onCancel?: () => void;
  inputType?: "text" | "email";
  placeholder?: string;
  mono?: boolean;
  uppercase?: boolean;
}

function InfoRow({
  icon: Icon,
  label,
  value,
  rawValue = "",
  field,
  editingField,
  isSavingField,
  fieldError,
  onEdit,
  onSave,
  onCancel,
  inputType = "text",
  placeholder,
  mono,
  uppercase,
}: Readonly<InfoRowProps>) {
  const isEditing = field !== undefined && editingField === field;
  const [draft, setDraft] = useState(rawValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setDraft(rawValue);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isEditing, rawValue]);

  const handleConfirm = () => {
    if (!field || !onSave) return;
    onSave(field, draft);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter")  handleConfirm();
    if (e.key === "Escape") onCancel?.();
  };

  return (
    <div
      className={cn(
        "group flex items-start gap-3 p-4 bg-muted/40 rounded-lg border border-border/50 transition-colors",
        isEditing && "border-ring/60 bg-background",
        !isEditing && field && "hover:border-border"
      )}
    >
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />

      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>

        {isEditing ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type={inputType}
                value={draft}
                onChange={(e) => {
                  const next = uppercase
                    ? e.target.value.toUpperCase()
                    : e.target.value;
                  setDraft(next);
                }}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={isSavingField}
                className={cn(
                  "flex-1 text-sm font-medium bg-transparent border-b border-ring outline-none py-0.5",
                  "placeholder:text-muted-foreground/50 disabled:opacity-50",
                  mono && "font-mono tracking-wide"
                )}
              />
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSavingField}
                title="Guardar"
                className="p-1 rounded text-success hover:bg-success-bg disabled:opacity-40 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={isSavingField}
                title="Cancelar"
                className="p-1 rounded text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {fieldError && (
              <p className="text-[11px] text-destructive leading-tight">{fieldError}</p>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div
              className={cn(
                "text-sm font-medium text-foreground break-all",
                mono && "font-mono text-xs tracking-wide"
              )}
            >
              {value ?? (
                <span className="text-muted-foreground italic">No especificado</span>
              )}
            </div>
            {field && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(field)}
                title={`Editar ${label.toLowerCase()}`}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-all shrink-0"
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });
}

export function AdminMvzInfoTab({
  detail,
  editingField,
  isSavingField,
  fieldError,
  setEditingField,
  onFieldErrorClear,
  onSave,
}: Readonly<Props>) {
  const handleEdit = (field: EditableField) => {
    onFieldErrorClear();
    setEditingField(field);
  };

  const handleSave = async (field: EditableField, value: string) => {
    await onSave(field, value);
  };

  const handleCancel = () => {
    onFieldErrorClear();
    setEditingField(null);
  };

  const shared = {
    editingField,
    isSavingField,
    fieldError,
    onEdit: handleEdit,
    onSave: handleSave,
    onCancel: handleCancel,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <InfoRow
        {...shared}
        icon={Mail}
        label="Correo electrónico"
        value={detail.email}
        rawValue={detail.email ?? ""}
        field="email"
        inputType="email"
        placeholder="correo@ejemplo.com"
      />
      <InfoRow
        {...shared}
        icon={CreditCard}
        label="Cédula MVZ"
        value={detail.licenseNumber}
        rawValue={detail.licenseNumber ?? ""}
        field="licenseNumber"
        placeholder="Ej. 0000000"
        mono
        uppercase
      />
      <InfoRow
        {...shared}
        icon={Mail}
        label="Nombre completo"
        value={detail.fullName}
        rawValue={detail.fullName}
        field="fullName"
        placeholder="Nombre completo"
      />
      <InfoRow
        icon={CalendarDays}
        label="Fecha de registro"
        value={formatDate(detail.createdAt)}
        editingField={editingField}
        isSavingField={isSavingField}
      />
      <InfoRow
        icon={Home}
        label="UPPs registradas"
        value={`${detail.totalUpps} unidades`}
        editingField={editingField}
        isSavingField={isSavingField}
      />
      <InfoRow
        icon={FlaskConical}
        label="Pruebas de campo"
        value={`${detail.totalTests} pruebas registradas`}
        editingField={editingField}
        isSavingField={isSavingField}
      />
    </div>
  );
}
