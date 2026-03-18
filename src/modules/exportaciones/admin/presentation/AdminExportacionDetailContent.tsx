"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Tag,
  Calendar,
  CheckSquare,
  AlertTriangle,
  Beef,
  GitBranch,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/shared/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import { Badge } from "@/shared/ui/badge";
import { DetailHeader } from "@/shared/ui/detail/DetailHeader";
import { DetailTabBar } from "@/shared/ui/detail/DetailTabBar";
import { DetailInfoGrid } from "@/shared/ui/detail/DetailInfoGrid";
import { DetailEmptyState } from "@/shared/ui/detail/DetailEmptyState";
import { AdminExportacionEstadoBadge } from "./AdminExportacionEstadoBadge";
import { AdminExportacionProcesoTimeline } from "./AdminExportacionProcesoTimeline";
import type { AdminExportacionDetallada } from "@/modules/exportaciones/admin/domain/entities/AdminExportacionDetailEntity";
import type { AdminExportacionAnimal } from "@/modules/exportaciones/admin/domain/entities/AdminExportacionAnimalEntity";
import type { UpdateAdminExportacionStatusDTO } from "@/modules/exportaciones/admin/application/dto/UpdateAdminExportacionStatusDTO";
import type { AdminExportacionStatus } from "@/modules/exportaciones/admin/domain/entities/AdminExportacionEntity";
import type { ExportacionDetailTab } from "./hooks/useAdminExportacionDetail";

const TABS = [
  { key: "info", label: "InformaciÃ³n", icon: FileText },
  { key: "animales", label: "Animales", icon: Beef },
  { key: "proceso", label: "Proceso", icon: GitBranch },
];

const ALERT_BADGE: Record<string, { label: string; className: string }> = {
  ok: { label: "OK", className: "bg-emerald-100 text-emerald-700" },
  por_vencer: { label: "Por vencer", className: "bg-amber-100 text-amber-700" },
  prueba_vencida: { label: "Prueba vencida", className: "bg-red-100 text-red-700" },
  sin_pruebas: { label: "Sin pruebas", className: "bg-gray-100 text-gray-500" },
  positivo: { label: "Positivo", className: "bg-red-100 text-red-700" },
  inactivo: { label: "Inactivo", className: "bg-gray-100 text-gray-500" },
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
}

function sexLabel(sex: string): string {
  if (sex === "M") return "Macho";
  if (sex === "F") return "Hembra";
  return sex;
}

function Check({ value }: Readonly<{ value: boolean | null | undefined }>) {
  if (value === true) return <span className="text-emerald-600 font-medium">SÃ­</span>;
  if (value === false) return <span className="text-red-500 font-medium">No</span>;
  return <span className="text-muted-foreground">â€”</span>;
}

function StatusActions({
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

  const canApprove =
    currentStatus === "mvz_validated" || currentStatus === "requested";
  const canBlock =
    currentStatus !== "final_approved" && currentStatus !== "blocked" && currentStatus !== "rejected";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> Acciones de estado
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {canApprove && (
          <Button
            size="sm"
            className="w-full"
            disabled={isUpdating}
            onClick={() => onUpdate({ status: "final_approved" })}
          >
            Aprobar exportaciÃ³n
          </Button>
        )}
        {currentStatus === "requested" && (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            disabled={isUpdating}
            onClick={() => onUpdate({ status: "mvz_validated" })}
          >
            Marcar como validada MVZ
          </Button>
        )}
        {canBlock && !showBlockInput && (
          <Button
            size="sm"
            variant="destructive"
            className="w-full"
            disabled={isUpdating}
            onClick={() => setShowBlockInput(true)}
          >
            Bloquear exportaciÃ³n
          </Button>
        )}
        {showBlockInput && (
          <div className="space-y-2">
            <textarea
              className="w-full text-sm border border-border rounded-md p-2 resize-none min-h-20"
              placeholder="Motivo de bloqueo..."
              value={blockedReason}
              onChange={(e) => setBlockedReason(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                disabled={!blockedReason.trim() || isUpdating}
                onClick={() => {
                  onUpdate({ status: "blocked", blockedReason: blockedReason.trim() });
                  setShowBlockInput(false);
                  setBlockedReason("");
                }}
              >
                Confirmar bloqueo
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowBlockInput(false);
                  setBlockedReason("");
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
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
    return <p className="text-sm text-muted-foreground py-4">Cargando animales...</p>;
  }
  if (animals.length === 0) {
    return (
      <DetailEmptyState
        icon={Beef}
        message="Sin animales registrados"
        description="No hay animales asociados a esta exportaciÃ³n."
      />
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Arete SINIIGA</TableHead>
          <TableHead>Sexo</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Alerta sanitaria</TableHead>
          <TableHead>Ãšlt. TB</TableHead>
          <TableHead>Ãšlt. BR</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {animals.map((a) => {
          const alertConfig = ALERT_BADGE[a.sanitaryAlert] ?? ALERT_BADGE["sin_pruebas"];
          return (
            <TableRow key={a.id}>
              <TableCell className="font-mono text-xs">{a.siniigaTag}</TableCell>
              <TableCell>{sexLabel(a.sex)}</TableCell>
              <TableCell>
                <Badge className={`border-0 text-xs ${a.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                  {a.status === "active" ? "Activo" : "Inactivo"}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={`border-0 text-xs ${alertConfig.className}`}>
                  {alertConfig.label}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {a.tbLastDate
                  ? new Date(a.tbLastDate).toLocaleDateString("es-MX")
                  : "â€”"}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {a.brLastDate
                  ? new Date(a.brLastDate).toLocaleDateString("es-MX")
                  : "â€”"}
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-7"
                  onClick={() => onNavigate(a.id)}
                >
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
}: Readonly<Props>) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-0">
      <DetailHeader
        title={`ExportaciÃ³n â€” ${detail.uppCode ?? detail.uppId ?? exportId.slice(0, 8)}`}
        subtitle={detail.producerName ?? undefined}
        backHref="/admin/exports"
        backLabel="Exportaciones"
      />

      <div className="px-6 py-4">
        <DetailTabBar
          tabs={TABS}
          active={activeTab}
          onChange={(k) => onTabChange(k as ExportacionDetailTab)}
        />
      </div>

      <div className="px-6 pb-8 space-y-4">
        {updateError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {updateError}
          </div>
        )}

        {activeTab === "info" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <DetailInfoGrid
                columns={3}
                items={[
                  {
                    label: "Estado",
                    icon: Tag,
                    value: <AdminExportacionEstadoBadge status={detail.status} />,
                  },
                  {
                    label: "Regla 60%",
                    icon: CheckSquare,
                    value: <Check value={detail.complianceRule60} />,
                  },
                  {
                    label: "TB / Brucelosis",
                    icon: CheckSquare,
                    value: <Check value={detail.tbBrValidated} />,
                  },
                  {
                    label: "Arete azul",
                    icon: Tag,
                    value: <Check value={detail.blueTagAssigned} />,
                  },
                  {
                    label: "Mes de exportaciÃ³n",
                    icon: Calendar,
                    value: detail.monthlyBucket
                      ? new Date(detail.monthlyBucket).toLocaleDateString("es-MX", { year: "numeric", month: "long" })
                      : null,
                  },
                  {
                    label: "Total animales",
                    icon: Beef,
                    value: String(detail.totalAnimals),
                  },
                  {
                    label: "UPP",
                    icon: FileText,
                    value: detail.uppName ?? detail.uppId ?? "â€”",
                  },
                  {
                    label: "Productor",
                    icon: FileText,
                    value: detail.producerName ?? "â€”",
                  },
                  {
                    label: "Creada",
                    icon: Calendar,
                    value: new Date(detail.createdAt).toLocaleDateString("es-MX"),
                  },
                  ...(detail.blockedReason
                    ? [{ label: "Motivo bloqueo", icon: AlertTriangle, value: detail.blockedReason }]
                    : []),
                ]}
              />
            </div>
            <div>
              <StatusActions
                currentStatus={detail.status}
                isUpdating={isUpdatingStatus}
                onUpdate={onUpdateStatus}
              />
            </div>
          </div>
        )}

        {activeTab === "animales" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Animales en exportaciÃ³n ({detail.totalAnimals})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <AnimalesTabContent
                loading={loadingAnimals}
                animals={animals}
                onNavigate={(id) => router.push(`/admin/exports/${exportId}/animals/${id}`)}
              />
            </CardContent>
          </Card>
        )}

        {activeTab === "proceso" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Proceso de exportaciÃ³n</CardTitle>
            </CardHeader>
            <CardContent>
              <AdminExportacionProcesoTimeline
                status={detail.status}
                blockedReason={detail.blockedReason}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

