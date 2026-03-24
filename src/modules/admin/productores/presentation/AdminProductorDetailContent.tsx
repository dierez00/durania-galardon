"use client";

import {
  User,
  Home,
  FileText,
  CalendarCheck,
  Beef,
} from "lucide-react";
import {
  DetailHeader,
  DetailTabBar,
  DetailEmptyState,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/shared/ui";
import { AdminProductorUppsList } from "./AdminProductorUppsList";
import { AdminProductorDocumentsList } from "./AdminProductorDocumentsList";
import { AdminProductorVisitsTable } from "./AdminProductorVisitsTable";
import { AdminProductorInfoTab } from "./AdminProductorInfoTab";
import { useAdminProductorDetail } from "./hooks/useAdminProductorDetail";
import type { ProductorDetailTab } from "./hooks/useAdminProductorDetail";

// Derive props type directly from the hook so they stay in sync automatically
type Props = ReturnType<typeof useAdminProductorDetail>;

const TABS: { key: ProductorDetailTab; label: string; icon: typeof User }[] = [
  { key: "info",       label: "Información",    icon: User },
  { key: "upps",       label: "UPPs / Ranchos", icon: Home },
  { key: "documentos", label: "Documentos",      icon: FileText },
  { key: "visitas",    label: "Visitas MVZ",     icon: CalendarCheck },
];

export function AdminProductorDetailContent({
  detail,
  loadingDetail,
  errorDetail,
  upps,
  loadingUpps,
  documents,
  loadingDocuments,
  visits,
  visitsTotal,
  visitsPage,
  loadingVisits,
  handleVisitsPageChange,
  activeTab,
  handleTabChange,
  isTogglingStatus,
  handleToggleStatus,
  showDeleteConfirm,
  setShowDeleteConfirm,
  isDeleting,
  handleConfirmDelete,
  editingField,
  setEditingField,
  isSavingField,
  fieldError,
  setFieldError,
  handleSaveField,
}: Readonly<Props>) {
  // ── Loading ───────────────────────────────────────────────────────────────────
  if (loadingDetail) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-24 bg-muted rounded-xl animate-pulse" />
        <div className="h-10 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          {["a", "b", "c", "d"].map((k) => (
            <div key={k} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ── Error / Not found ─────────────────────────────────────────────────────────
  if (errorDetail || !detail) {
    return (
      <DetailEmptyState
        icon={User}
        message={errorDetail || "No se encontró el productor."}
        description="Verifica que el enlace sea correcto o regresa al listado."
      />
    );
  }

  const isActive = detail.status === "active";

  const tabsWithCount = TABS.map((t) => {
    if (t.key === "upps")       return { ...t, count: detail.totalUpps };
    if (t.key === "documentos") return { ...t, count: detail.totalDocuments > 0 ? detail.totalDocuments : undefined };
    if (t.key === "visitas")    return { ...t, count: visitsTotal > 0 ? visitsTotal : undefined };
    return t;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <DetailHeader
        title={detail.fullName}
        subtitle={detail.curp ? `CURP: ${detail.curp}` : undefined}
        backHref="/admin/producers"
        backLabel="Productores"
        status={detail.status}
        statusLabel={isActive ? "Activo" : "Inactivo"}
        statusVariant={isActive ? "active" : "inactive"}
        onToggleStatus={handleToggleStatus}
        toggleStatusLabel={isActive ? "Desactivar" : "Activar"}
        isTogglingStatus={isTogglingStatus}
        onDelete={() => setShowDeleteConfirm(true)}
      />

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "UPPs",            value: detail.totalUpps,        icon: Home },
          { label: "Bovinos activos", value: detail.totalBovinos,     icon: Beef },
          { label: "Documentos",      value: detail.totalDocuments, icon: FileText },
          { label: "Visitas",         value: detail.totalVisits,    icon: CalendarCheck },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="flex flex-col items-center p-3 bg-muted/40 rounded-lg border border-border/50 text-center"
          >
            <Icon className="w-5 h-5 text-muted-foreground mb-1" />
            <span className="text-xl font-bold">{value}</span>
            <span className="text-[11px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <DetailTabBar
        tabs={tabsWithCount}
        active={activeTab}
        onChange={(key) => handleTabChange(key as ProductorDetailTab)}
      />

      {/* Tab content */}
      <div>
        {activeTab === "info" && (
          <AdminProductorInfoTab
            detail={detail}
            editingField={editingField}
            setEditingField={setEditingField}
            isSavingField={isSavingField}
            fieldError={fieldError}
            onFieldErrorClear={() => setFieldError(null)}
            onSave={handleSaveField}
          />
        )}

        {activeTab === "upps" && (
          <AdminProductorUppsList upps={upps} loading={loadingUpps} />
        )}

        {activeTab === "documentos" && (
          <AdminProductorDocumentsList documents={documents} loading={loadingDocuments} />
        )}

        {activeTab === "visitas" && (
          <AdminProductorVisitsTable
            visits={visits}
            total={visitsTotal}
            page={visitsPage}
            loading={loadingVisits}
            onPageChange={handleVisitsPageChange}
          />
        )}
      </div>

      {/* Confirm delete dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar a{" "}
              <strong className="text-foreground">{detail.fullName}</strong>? Esta
              acción desactivará al productor y a su cuenta de usuario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando..." : "Eliminar productor"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
