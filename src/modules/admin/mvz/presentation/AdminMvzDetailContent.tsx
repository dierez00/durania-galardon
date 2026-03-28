"use client";

import {
  User,
  Home,
  FlaskConical,
  CalendarCheck,
  MapPin,
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
  DetailEmptyState,
  DetailHeader,
  DetailInfoGrid,
  DetailSidebarSection,
  DetailTabBar,
  DetailWorkspace,
} from "@/shared/ui";
import { AdminMvzEstadoBadge } from "./AdminMvzEstadoBadge";
import { AdminMvzUppsTab } from "./AdminMvzUppsTab";
import { AdminMvzTestsList } from "./AdminMvzTestsList";
import { AdminMvzVisitsTable } from "./AdminMvzVisitsTable";
import { AdminMvzInfoTab } from "./AdminMvzInfoTab";
import { useAdminMvzDetail, type MvzDetailViewTab } from "./hooks/useAdminMvzDetail";

type Props = ReturnType<typeof useAdminMvzDetail>;

const TABS: { key: MvzDetailViewTab; label: string; icon: typeof User }[] = [
  { key: "overview", label: "Overview", icon: User },
  { key: "info", label: "Informacion", icon: User },
  { key: "upps", label: "UPPs / Ranchos", icon: Home },
  { key: "pruebas", label: "Pruebas de campo", icon: FlaskConical },
  { key: "visitas", label: "Visitas", icon: CalendarCheck },
];

export function AdminMvzDetailContent({
  detail,
  loadingDetail,
  errorDetail,
  upps,
  loadingUpps,
  uppSubTab,
  handleUppSubTabChange,
  availableUpps,
  loadingAvailableUpps,
  uppPendingUnassign,
  setUppPendingUnassign,
  uppPendingAssign,
  setUppPendingAssign,
  isProcessingUpp,
  handleConfirmAssign,
  handleConfirmUnassign,
  tests,
  loadingTests,
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
    return <p className="py-16 text-center text-sm text-muted-foreground">Cargando MVZ...</p>;
  }

  if (errorDetail || !detail) {
    return (
      <DetailEmptyState
        icon={User}
        message={errorDetail || "No se encontro el MVZ."}
        description="Verifica que el enlace sea correcto o regresa al listado."
      />
    );
  }

  const isActive = detail.status === "active";
  const tabsWithCount = TABS.map((tab) => {
    if (tab.key === "upps") return { ...tab, count: detail.totalUpps };
    if (tab.key === "pruebas") return { ...tab, count: detail.totalTests || undefined };
    if (tab.key === "visitas") return { ...tab, count: detail.totalVisits || undefined };
    return tab;
  });

  const mainContent =
    activeTab === "info" ? (
      <AdminMvzInfoTab
        detail={detail}
        editingField={editingField}
        setEditingField={setEditingField}
        isSavingField={isSavingField}
        fieldError={fieldError}
        onFieldErrorClear={() => setFieldError(null)}
        onSave={handleSaveField}
      />
    ) : activeTab === "upps" ? (
      <AdminMvzUppsTab
        upps={upps}
        loadingUpps={loadingUpps}
        uppSubTab={uppSubTab}
        handleUppSubTabChange={handleUppSubTabChange}
        availableUpps={availableUpps}
        loadingAvailableUpps={loadingAvailableUpps}
        uppPendingUnassign={uppPendingUnassign}
        setUppPendingUnassign={setUppPendingUnassign}
        uppPendingAssign={uppPendingAssign}
        setUppPendingAssign={setUppPendingAssign}
        isProcessingUpp={isProcessingUpp}
        handleConfirmAssign={handleConfirmAssign}
        handleConfirmUnassign={handleConfirmUnassign}
      />
    ) : activeTab === "pruebas" ? (
      <AdminMvzTestsList tests={tests} loading={loadingTests} />
    ) : activeTab === "visitas" ? (
      <AdminMvzVisitsTable
        visits={visits}
        total={visitsTotal}
        page={visitsPage}
        loading={loadingVisits}
        onPageChange={handleVisitsPageChange}
      />
    ) : (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <DetailInfoGrid
              columns={2}
              items={[
                { label: "Nombre", icon: User, value: detail.fullName },
                { label: "Cedula", icon: ShieldCheck, value: detail.licenseNumber },
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
          <CardContent className="pt-6">
            <DetailInfoGrid
              columns={2}
              items={[
                { label: "UPPs asignadas", icon: Home, value: String(detail.totalUpps) },
                { label: "Asignaciones activas", icon: MapPin, value: String(detail.activeAssignments) },
                { label: "Pruebas registradas", icon: FlaskConical, value: String(detail.totalTests) },
                { label: "Visitas", icon: CalendarCheck, value: String(detail.totalVisits) },
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
        subtitle={detail.licenseNumber ? `Cedula: ${detail.licenseNumber}` : undefined}
        backHref="/admin/mvz"
        backLabel="MVZ"
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
              { label: "Asignaciones activas", value: detail.activeAssignments, icon: MapPin },
              { label: "Pruebas", value: detail.totalTests, icon: FlaskConical },
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
        tabs={<DetailTabBar tabs={tabsWithCount} active={activeTab} onChange={(key) => handleTabChange(key as MvzDetailViewTab)} />}
        main={mainContent}
        sidebar={
          <>
            <DetailSidebarSection title="Acciones Rapidas" contentClassName="space-y-2">
              <Button type="button" variant={activeTab === "info" ? "secondary" : "outline"} className="w-full justify-start" onClick={() => handleTabChange("info")}>
                Editar informacion
              </Button>
              <Button type="button" variant={activeTab === "upps" ? "secondary" : "outline"} className="w-full justify-start" onClick={() => handleTabChange("upps")}>
                Gestionar UPPs
              </Button>
              <Button type="button" variant={activeTab === "pruebas" ? "secondary" : "outline"} className="w-full justify-start" onClick={() => handleTabChange("pruebas")}>
                Revisar pruebas
              </Button>
              <Button type="button" variant="outline" className="w-full justify-start" disabled={isTogglingStatus} onClick={handleToggleStatus}>
                {isActive ? "Desactivar MVZ" : "Activar MVZ"}
              </Button>
              <Button type="button" variant="destructive" className="w-full justify-start" onClick={() => setShowDeleteConfirm(true)}>
                Dar de baja
              </Button>
            </DetailSidebarSection>

            <DetailSidebarSection title="Informacion" contentClassName="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Estado</p>
                <AdminMvzEstadoBadge status={detail.status} />
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
              {isDeleting ? "Eliminando..." : "Eliminar MVZ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
