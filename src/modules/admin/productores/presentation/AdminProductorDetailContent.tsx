"use client";

import {
  User,
  Home,
  FileText,
  CalendarCheck,
  Beef,
  Mail,
  ShieldCheck,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DetailEmptyState,
  DetailHeader,
  DetailInfoGrid,
  DetailSidebarSection,
  DetailTabBar,
  DetailWorkspace,
} from "@/shared/ui";
import { AdminProductorEstadoBadge } from "./AdminProductorEstadoBadge";
import { AdminProductorUppsList } from "./AdminProductorUppsList";
import { AdminProductorDocumentsList } from "./AdminProductorDocumentsList";
import { AdminProductorVisitsTable } from "./AdminProductorVisitsTable";
import { AdminProductorInfoTab } from "./AdminProductorInfoTab";
import { AdminProductorDocumentReviewDialog } from "./components/AdminProductorDocumentReviewDialog";
import { useAdminProductorDetail, type ProductorDetailViewTab } from "./hooks/useAdminProductorDetail";

type Props = ReturnType<typeof useAdminProductorDetail>;

const TABS: { key: ProductorDetailViewTab; label: string; icon: typeof User }[] = [
  { key: "overview", label: "Overview", icon: User },
  { key: "info", label: "Informacion", icon: User },
  { key: "upps", label: "UPPs / Ranchos", icon: Home },
  { key: "documentos", label: "Documentos", icon: FileText },
  { key: "visitas", label: "Visitas MVZ", icon: CalendarCheck },
];

export function AdminProductorDetailContent({
  detail,
  loadingDetail,
  errorDetail,
  upps,
  loadingUpps,
  documents,
  loadingDocuments,
  reviewDialogOpen,
  selectedDocument,
  selectedDocumentDetail,
  selectedDocumentUrl,
  loadingSelectedDocument,
  loadingSelectedFile,
  reviewError,
  reviewStatus,
  reviewComments,
  reviewExpiryDate,
  reviewDirty,
  isReviewSaving,
  setReviewStatus,
  setReviewComments,
  setReviewExpiryDate,
  handleOpenDocumentReview,
  handleCloseReviewDialog,
  handleSaveDocumentReview,
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
  if (loadingDetail) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Cargando productor...</p>;
  }

  if (errorDetail || !detail) {
    return (
      <DetailEmptyState
        icon={User}
        message={errorDetail || "No se encontro el productor."}
        description="Verifica que el enlace sea correcto o regresa al listado."
      />
    );
  }

  const isActive = detail.status === "active";
  const tabsWithCount = TABS.map((tab) => {
    if (tab.key === "upps") return { ...tab, count: detail.totalUpps };
    if (tab.key === "documentos") return { ...tab, count: detail.totalDocuments || undefined };
    if (tab.key === "visitas") return { ...tab, count: detail.totalVisits || undefined };
    return tab;
  });

  const mainContent =
    activeTab === "info" ? (
      <AdminProductorInfoTab
        detail={detail}
        editingField={editingField}
        setEditingField={setEditingField}
        isSavingField={isSavingField}
        fieldError={fieldError}
        onFieldErrorClear={() => setFieldError(null)}
        onSave={handleSaveField}
      />
    ) : activeTab === "upps" ? (
      <AdminProductorUppsList upps={upps} loading={loadingUpps} />
    ) : activeTab === "documentos" ? (
      <AdminProductorDocumentsList
        documents={documents}
        loading={loadingDocuments}
        onReview={handleOpenDocumentReview}
      />
    ) : activeTab === "visitas" ? (
      <AdminProductorVisitsTable
        visits={visits}
        total={visitsTotal}
        page={visitsPage}
        loading={loadingVisits}
        onPageChange={handleVisitsPageChange}
      />
    ) : (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informacion general</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailInfoGrid
              columns={2}
              items={[
                { label: "Nombre", icon: User, value: detail.fullName },
                { label: "CURP", icon: ShieldCheck, value: detail.curp ?? "Sin CURP" },
                { label: "Correo", icon: Mail, value: detail.email ?? "Sin correo" },
                {
                  label: "Registrado",
                  icon: CalendarCheck,
                  value: new Date(detail.createdAt).toLocaleDateString("es-MX"),
                },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actividad operativa</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailInfoGrid
              columns={2}
              items={[
                { label: "UPPs vinculadas", icon: Home, value: String(detail.totalUpps) },
                { label: "Bovinos activos", icon: Beef, value: String(detail.totalBovinos) },
                { label: "Documentos", icon: FileText, value: String(detail.totalDocuments) },
                { label: "Visitas MVZ", icon: CalendarCheck, value: String(detail.totalVisits) },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    );

  return (
    <div className="space-y-6">
      <DetailHeader
        title={detail.fullName}
        subtitle={detail.curp ? `CURP: ${detail.curp}` : undefined}
        backHref="/admin/producers"
        backLabel="Productores"
        status={detail.status}
        statusLabel={isActive ? "Activo" : "Inactivo"}
        statusVariant={isActive ? "active" : "inactive"}
        onEdit={() => handleTabChange("info")}
        onToggleStatus={handleToggleStatus}
        toggleStatusLabel={isActive ? "Desactivar" : "Activar"}
        isTogglingStatus={isTogglingStatus}
        onDelete={() => setShowDeleteConfirm(true)}
      />

      <DetailWorkspace
        summary={
          <div className="grid gap-4 lg:grid-cols-4">
            {[
              { label: "UPPs", value: detail.totalUpps, icon: Home },
              { label: "Bovinos activos", value: detail.totalBovinos, icon: Beef },
              { label: "Documentos", value: detail.totalDocuments, icon: FileText },
              { label: "Visitas", value: detail.totalVisits, icon: CalendarCheck },
            ].map(({ label, value, icon: Icon }) => (
              <Card key={label}>
                <CardContent className="flex items-center gap-3 p-5">
                  <div className="rounded-full border border-border/70 bg-muted/20 p-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        }
        tabs={<DetailTabBar tabs={tabsWithCount} active={activeTab} onChange={(key) => handleTabChange(key as ProductorDetailViewTab)} />}
        main={mainContent}
        sidebar={
          <>
            <DetailSidebarSection title="Acciones Rapidas" contentClassName="space-y-2">
              <Button type="button" variant={activeTab === "info" ? "secondary" : "outline"} className="w-full justify-start" onClick={() => handleTabChange("info")}>
                Editar informacion
              </Button>
              <Button type="button" variant={activeTab === "documentos" ? "secondary" : "outline"} className="w-full justify-start" onClick={() => handleTabChange("documentos")}>
                Revisar documentos
              </Button>
              <Button type="button" variant={activeTab === "visitas" ? "secondary" : "outline"} className="w-full justify-start" onClick={() => handleTabChange("visitas")}>
                Ver visitas
              </Button>
              <Button type="button" variant="outline" className="w-full justify-start" disabled={isTogglingStatus} onClick={handleToggleStatus}>
                {isActive ? "Desactivar productor" : "Activar productor"}
              </Button>
              <Button type="button" variant="destructive" className="w-full justify-start" onClick={() => setShowDeleteConfirm(true)}>
                Dar de baja
              </Button>
            </DetailSidebarSection>

            <DetailSidebarSection title="Informacion" contentClassName="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Estado</p>
                <AdminProductorEstadoBadge status={detail.status} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Correo</p>
                <p>{detail.email ?? "Sin correo"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Registrado</p>
                <p>{new Date(detail.createdAt).toLocaleDateString("es-MX")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ID</p>
                <p className="break-all font-mono text-xs">{detail.id}</p>
              </div>
            </DetailSidebarSection>
          </>
        }
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar eliminacion</AlertDialogTitle>
            <AlertDialogDescription>
              Estas por desactivar a <strong className="text-foreground">{detail.fullName}</strong> y su cuenta
              vinculada.
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

      <AdminProductorDocumentReviewDialog
        open={reviewDialogOpen}
        onOpenChange={handleCloseReviewDialog}
        selectedDocument={selectedDocument}
        detail={selectedDocumentDetail}
        fileUrl={selectedDocumentUrl}
        loading={loadingSelectedDocument}
        loadingFile={loadingSelectedFile}
        error={reviewError}
        status={reviewStatus}
        comments={reviewComments}
        expiryDate={reviewExpiryDate}
        dirty={reviewDirty}
        isSaving={isReviewSaving}
        onStatusChange={setReviewStatus}
        onCommentsChange={setReviewComments}
        onExpiryDateChange={setReviewExpiryDate}
        onSave={() => handleSaveDocumentReview(false)}
        onSaveAndNext={() => handleSaveDocumentReview(true)}
      />
    </div>
  );
}
