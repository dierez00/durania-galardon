"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Beef,
  Calendar,
  CheckSquare,
  FileText,
  GitBranch,
  ShieldCheck,
  Tag,
  UserRound,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import {
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import { Badge } from "@/shared/ui/badge";
import { AdminExportacionEstadoBadge } from "./AdminExportacionEstadoBadge";
import { AdminExportacionProcesoTimeline } from "./AdminExportacionProcesoTimeline";
import { toneToBadgeVariant, type SemanticTone } from "@/shared/ui/theme";
import type { AdminExportacionDetallada } from "@/modules/exportaciones/admin/domain/entities/AdminExportacionDetailEntity";
import type { AdminExportacionAnimal } from "@/modules/exportaciones/admin/domain/entities/AdminExportacionAnimalEntity";
import type { UpdateAdminExportacionStatusDTO } from "@/modules/exportaciones/admin/application/dto/UpdateAdminExportacionStatusDTO";
import type { AdminExportacionStatus } from "@/modules/exportaciones/admin/domain/entities/AdminExportacionEntity";
import type { ExportacionDetailTab } from "./hooks/useAdminExportacionDetail";
import { cn } from "@/shared/lib/utils";

const TABS = [
  { key: "info", label: "Informacion", icon: FileText },
  { key: "animales", label: "Animales", icon: Beef },
  { key: "proceso", label: "Proceso", icon: GitBranch },
];

const ALERT_BADGE: Record<string, { label: string; tone: SemanticTone }> = {
  ok: { label: "OK", tone: "success" },
  por_vencer: { label: "Por vencer", tone: "warning" },
  prueba_vencida: { label: "Prueba vencida", tone: "error" },
  sin_pruebas: { label: "Sin pruebas", tone: "neutral" },
  positivo: { label: "Positivo", tone: "error" },
  inactivo: { label: "Inactivo", tone: "neutral" },
};

interface Props {
  exportId: string;
  detail: AdminExportacionDetallada;
  animals: AdminExportacionAnimal[];
  loadingAnimals: boolean;
  activeTab: ExportacionDetailTab;
  onTabChange: (tab: ExportacionDetailTab) => void;
  isUpdatingStatus: boolean;
  updateError: string | null;
  onUpdateStatus: (dto: UpdateAdminExportacionStatusDTO) => void;
  focusStatus?: boolean;
}

function sexLabel(sex: string): string {
  if (sex === "M") return "Macho";
  if (sex === "F") return "Hembra";
  return sex;
}

function healthStatusLabel(status: string | null): string {
  if (!status) return "Sin definir";
  if (status === "healthy") return "Sano";
  if (status === "observation") return "Observacion";
  if (status === "quarantine") return "Cuarentena";
  return status;
}

function Check({ value }: Readonly<{ value: boolean | null | undefined }>) {
  if (value === true) return <span className="font-medium text-success">Si</span>;
  if (value === false) return <span className="font-medium text-error">No</span>;
  return <span className="text-muted-foreground">-</span>;
}

function StatusActionsPanel({
  currentStatus,
  isUpdating,
  onUpdate,
}: Readonly<{
  currentStatus: AdminExportacionStatus;
  isUpdating: boolean;
  onUpdate: (dto: UpdateAdminExportacionStatusDTO) => void;
}>) {
  const [blockedReason, setBlockedReason] = useState("");
  const [showBlockInput, setShowBlockInput] = useState(false);

  const canApprove = currentStatus === "mvz_validated" || currentStatus === "requested";
  const canBlock = currentStatus !== "final_approved" && currentStatus !== "blocked" && currentStatus !== "rejected";

  return (
    <div className="space-y-2">
      {canApprove && (
        <Button
          type="button"
          className="w-full justify-start"
          disabled={isUpdating}
          onClick={() => onUpdate({ status: "final_approved" })}
        >
          Aprobar exportacion
        </Button>
      )}
      {currentStatus === "requested" && (
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start"
          disabled={isUpdating}
          onClick={() => onUpdate({ status: "mvz_validated" })}
        >
          Marcar validada por MVZ
        </Button>
      )}
      {canBlock && !showBlockInput && (
        <Button
          type="button"
          variant="destructive"
          className="w-full justify-start"
          disabled={isUpdating}
          onClick={() => setShowBlockInput(true)}
        >
          Bloquear exportacion
        </Button>
      )}
      {showBlockInput ? (
        <div className="space-y-2">
          <textarea
            className="min-h-24 w-full resize-none rounded-md border border-border p-2 text-sm"
            placeholder="Motivo de bloqueo..."
            value={blockedReason}
            onChange={(event) => setBlockedReason(event.target.value)}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={!blockedReason.trim() || isUpdating}
              onClick={() => {
                onUpdate({ status: "blocked", blockedReason: blockedReason.trim() });
                setShowBlockInput(false);
                setBlockedReason("");
              }}
            >
              Confirmar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowBlockInput(false);
                setBlockedReason("");
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AnimalesTabContent({
  loading,
  animals,
  onNavigate,
}: Readonly<{
  loading: boolean;
  animals: AdminExportacionAnimal[];
  onNavigate: (id: string) => void;
}>) {
  if (loading) {
    return <p className="py-4 text-sm text-muted-foreground">Cargando animales...</p>;
  }
  if (animals.length === 0) {
    return (
      <DetailEmptyState
        icon={Beef}
        message="Sin animales registrados"
        description="No hay animales asociados a esta exportacion."
      />
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Arete SINIIGA</TableHead>
          <TableHead>Perfil</TableHead>
          <TableHead>Sexo</TableHead>
          <TableHead>Salud</TableHead>
          <TableHead>Collar</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Alerta sanitaria</TableHead>
          <TableHead>Ult. TB</TableHead>
          <TableHead>Ult. BR</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {animals.map((animal) => {
          const alertConfig = ALERT_BADGE[animal.sanitaryAlert] ?? ALERT_BADGE.sin_pruebas;
          return (
            <TableRow key={animal.id}>
              <TableCell className="font-mono text-xs">{animal.siniigaTag}</TableCell>
              <TableCell className="text-sm">
                <div className="font-medium">{animal.name ?? "Sin nombre"}</div>
                <div className="text-xs text-muted-foreground">
                  {[animal.breed, animal.ageYears != null ? `${animal.ageYears} ano(s)` : null]
                    .filter(Boolean)
                    .join(" · ") || "Sin perfil ampliado"}
                </div>
              </TableCell>
              <TableCell>{sexLabel(animal.sex)}</TableCell>
              <TableCell className="text-sm">
                <div>{healthStatusLabel(animal.healthStatus)}</div>
                <div className="text-xs text-muted-foreground">
                  {animal.weightKg != null ? `${animal.weightKg.toFixed(1)} kg` : "Peso sin registro"}
                </div>
              </TableCell>
              <TableCell className="text-sm">
                <div className="font-mono">{animal.currentCollarId ?? "Sin collar"}</div>
                <div className="text-xs text-muted-foreground">
                  {animal.currentCollarLinkedAt
                    ? new Date(animal.currentCollarLinkedAt).toLocaleDateString("es-MX")
                    : "Sin vinculo activo"}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={toneToBadgeVariant[animal.status === "active" ? "success" : "neutral"]} className="text-xs">
                  {animal.status === "active" ? "Activo" : "Inactivo"}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={toneToBadgeVariant[alertConfig.tone]} className="text-xs">
                  {alertConfig.label}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {animal.tbLastDate ? new Date(animal.tbLastDate).toLocaleDateString("es-MX") : "-"}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {animal.brLastDate ? new Date(animal.brLastDate).toLocaleDateString("es-MX") : "-"}
              </TableCell>
              <TableCell>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onNavigate(animal.id)}>
                  Ver detalle
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function AdminExportacionDetailContent({
  exportId,
  detail,
  animals,
  loadingAnimals,
  activeTab,
  onTabChange,
  isUpdatingStatus,
  updateError,
  onUpdateStatus,
  focusStatus = false,
}: Readonly<Props>) {
  const router = useRouter();

  const mainContent =
    activeTab === "animales" ? (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Animales en exportacion ({detail.totalAnimals})</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <AnimalesTabContent
            loading={loadingAnimals}
            animals={animals}
            onNavigate={(animalId) => router.push(`/admin/exports/${exportId}/animals/${animalId}`)}
          />
        </CardContent>
      </Card>
    ) : activeTab === "proceso" ? (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Proceso de exportacion</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminExportacionProcesoTimeline status={detail.status} blockedReason={detail.blockedReason} />
        </CardContent>
      </Card>
    ) : (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumen operativo</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailInfoGrid
              columns={3}
              items={[
                { label: "Estado", icon: Tag, value: <AdminExportacionEstadoBadge status={detail.status} /> },
                { label: "Regla 60", icon: CheckSquare, value: <Check value={detail.complianceRule60} /> },
                { label: "TB / Brucelosis", icon: ShieldCheck, value: <Check value={detail.tbBrValidated} /> },
                { label: "Arete azul", icon: Tag, value: <Check value={detail.blueTagAssigned} /> },
                {
                  label: "Mes de exportacion",
                  icon: Calendar,
                  value: detail.monthlyBucket
                    ? new Date(detail.monthlyBucket).toLocaleDateString("es-MX", { year: "numeric", month: "long" })
                    : "Sin definir",
                },
                { label: "Total animales", icon: Beef, value: String(detail.totalAnimals) },
                { label: "UPP", icon: FileText, value: detail.uppName ?? detail.uppId ?? "-" },
                { label: "Productor", icon: UserRound, value: detail.producerName ?? "-" },
                { label: "Creada", icon: Calendar, value: new Date(detail.createdAt).toLocaleDateString("es-MX") },
                ...(detail.blockedReason
                  ? [{ label: "Motivo de bloqueo", icon: AlertTriangle, value: detail.blockedReason }]
                  : []),
              ]}
            />
          </CardContent>
        </Card>
      </div>
    );

  return (
    <div className="space-y-6">
      <DetailHeader
        title={`Exportacion ${detail.uppCode ?? detail.uppId ?? exportId.slice(0, 8)}`}
        subtitle={detail.producerName ?? undefined}
        backHref="/admin/exports"
        backLabel="Exportaciones"
      />

      {updateError ? (
        <Alert variant="error">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <AlertDescription>{updateError}</AlertDescription>
        </Alert>
      ) : null}

      <DetailWorkspace
        summary={
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Productor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="font-medium">{detail.producerName ?? "Sin productor"}</p>
                <p className="text-muted-foreground">{detail.uppName ?? detail.uppId ?? "Sin UPP"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Cumplimiento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>Regla 60: <Check value={detail.complianceRule60} /></p>
                <p>TB/BR: <Check value={detail.tbBrValidated} /></p>
                <p>Arete azul: <Check value={detail.blueTagAssigned} /></p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Estado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <AdminExportacionEstadoBadge status={detail.status} />
                <p className="text-muted-foreground">Animales: {detail.totalAnimals}</p>
              </CardContent>
            </Card>
          </div>
        }
        tabs={<DetailTabBar tabs={TABS} active={activeTab} onChange={(key) => onTabChange(key as ExportacionDetailTab)} />}
        main={mainContent}
        sidebar={
          <>
            <DetailSidebarSection
              title="Acciones Rapidas"
              className={cn(focusStatus && "ring-2 ring-primary/25 ring-offset-2 ring-offset-background")}
              contentClassName="space-y-3"
            >
              <StatusActionsPanel currentStatus={detail.status} isUpdating={isUpdatingStatus} onUpdate={onUpdateStatus} />
              <Button type="button" variant={activeTab === "info" ? "secondary" : "outline"} className="w-full justify-start" onClick={() => onTabChange("info")}>
                Ver resumen
              </Button>
              <Button type="button" variant={activeTab === "animales" ? "secondary" : "outline"} className="w-full justify-start" onClick={() => onTabChange("animales")}>
                Revisar animales
              </Button>
              <Button type="button" variant={activeTab === "proceso" ? "secondary" : "outline"} className="w-full justify-start" onClick={() => onTabChange("proceso")}>
                Ver proceso
              </Button>
            </DetailSidebarSection>

            <DetailSidebarSection title="Informacion" contentClassName="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Creada</p>
                <p>{new Date(detail.createdAt).toLocaleString("es-MX")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Actualizada</p>
                <p>{detail.updatedAt ? new Date(detail.updatedAt).toLocaleString("es-MX") : "Sin cambios"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ID</p>
                <p className="break-all font-mono text-xs">{detail.id}</p>
              </div>
            </DetailSidebarSection>
          </>
        }
      />
    </div>
  );
}
