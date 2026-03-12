"use client";

import {
  FlaskConical,
  AlertTriangle,
  Syringe,
  Truck,
  GitFork,
  Loader2,
  Tag,
  CalendarDays,
  MapPin,
  User2,
  Activity,
} from "lucide-react";
import { DetailHeader } from "@/shared/ui/detail/DetailHeader";
import { DetailInfoGrid } from "@/shared/ui/detail/DetailInfoGrid";
import { DetailTabBar } from "@/shared/ui/detail/DetailTabBar";
import { DetailEmptyState } from "@/shared/ui/detail/DetailEmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { SanitarioBadge } from "./SanitarioBadge";
import { PruebaStatusBadge } from "./PruebaStatusBadge";
import { ExportableCheckBadge } from "./ExportableCheckBadge";
import { exportabilityReason } from "@/modules/bovinos/domain/services/checkExportability";
import {
  useBovinoDetail,
  type BovinoDetailTab,
} from "./hooks/useBovinoDetail";

interface Props {
  readonly id: string;
}

function fmt(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function bool(v: boolean | null): string {
  if (v === null) return "—";
  return v ? "Sí" : "No";
}

const TABS = [
  { key: "pruebas", label: "Pruebas TB/BR", icon: FlaskConical },
  { key: "incidentes", label: "Incidentes sanitarios", icon: AlertTriangle },
  { key: "genealogia", label: "Genealogía", icon: GitFork },
  { key: "vacunaciones", label: "Vacunaciones", icon: Syringe },
  { key: "exportaciones", label: "Exportaciones", icon: Truck },
];

export function BovinoDetail({ id }: Props) {
  const {
    bovino,
    loading,
    error,
    activeTab,
    setActiveTab,
    fieldTests,
    incidents,
    vaccinations,
    exports,
    offspring,
  } = useBovinoDetail(id);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Cargando detalle...</span>
      </div>
    );
  }

  if (error || !bovino) {
    return (
      <div className="py-12 text-center text-sm text-destructive">
        {error || "Bovino no encontrado."}
      </div>
    );
  }

  const infoItems = [
    {
      label: "Arete SINIIGA",
      value: <span className="font-mono">{bovino.siniiga_tag}</span>,
      icon: Tag,
    },
    {
      label: "Sexo",
      value: bovino.sex === "M" ? "Macho" : "Hembra",
      icon: User2,
    },
    { label: "Fecha de nacimiento", value: fmt(bovino.birth_date), icon: CalendarDays },
    {
      label: "Madre",
      value: bovino.mother_animal_id ? (
        <span className="font-mono text-xs">{bovino.mother_animal_id}</span>
      ) : null,
      icon: GitFork,
    },
    {
      label: "Rancho (UPP)",
      value: bovino.upp_name || "—",
      icon: MapPin,
    },
    {
      label: "Clave UPP",
      value: bovino.upp_code || "—",
      icon: Tag,
    },
    {
      label: "Estado UPP",
      value: <SanitarioBadge estado={bovino.upp_status} />,
      icon: Activity,
    },
    {
      label: "Estado animal",
      value: <SanitarioBadge estado={bovino.status} />,
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-6">
      <DetailHeader
        title={bovino.siniiga_tag}
        subtitle={`${bovino.upp_name}${bovino.upp_code ? ` (${bovino.upp_code})` : ""}`}
        backHref="/producer/bovinos"
        backLabel="Volver a bovinos"
        status={bovino.status}
        statusLabel={bovino.status}
        statusVariant={bovino.status === "active" ? "active" : "inactive"}
      />

      {/* Indicadores de exportabilidad */}
      <div className="flex flex-wrap items-center gap-4 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">TB:</span>
          <PruebaStatusBadge
            status={bovino.sanitary.tb_status ?? "sin_prueba"}
            result={bovino.sanitary.tb_result}
            label="Tuberculosis"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">BR:</span>
          <PruebaStatusBadge
            status={bovino.sanitary.br_status ?? "sin_prueba"}
            result={bovino.sanitary.br_result}
            label="Brucelosis"
          />
        </div>
        <ExportableCheckBadge
          canExport={bovino.canExport}
          reason={bovino.canExport ? undefined : exportabilityReason(bovino)}
        />
      </div>

      {/* Info grid */}
      <DetailInfoGrid items={infoItems} columns={3} />

      {/* Tabs */}
      <DetailTabBar
        tabs={TABS}
        active={activeTab}
        onChange={(k) => setActiveTab(k as BovinoDetailTab)}
      />

      {/* Pruebas TB/BR */}
      {activeTab === "pruebas" && (
        fieldTests.length === 0 ? (
          <DetailEmptyState
            icon={FlaskConical}
            message="Sin pruebas registradas"
            description="No existen registros de pruebas de campo para este bovino."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Fecha muestra</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Válido hasta</TableHead>
                <TableHead>MVZ</TableHead>
                <TableHead>Capturado en</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fieldTests.map((ft) => (
                <TableRow key={ft.id}>
                  <TableCell className="font-medium uppercase">{ft.test_type_key}</TableCell>
                  <TableCell>{fmt(ft.sample_date)}</TableCell>
                  <TableCell>
                    <SanitarioBadge estado={ft.result} />
                  </TableCell>
                  <TableCell>{fmt(ft.valid_until)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {ft.mvz_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {ft.captured_lat != null && ft.captured_lng != null
                      ? `${ft.captured_lat.toFixed(4)}, ${ft.captured_lng.toFixed(4)}`
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      )}

      {/* Incidentes */}
      {activeTab === "incidentes" && (
        incidents.length === 0 ? (
          <DetailEmptyState
            icon={AlertTriangle}
            message="Sin incidentes registrados"
            description="No se han reportado incidentes sanitarios para este bovino."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Severidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Detectado</TableHead>
                <TableHead>Resuelto</TableHead>
                <TableHead>MVZ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.map((inc) => (
                <TableRow key={inc.id}>
                  <TableCell>{inc.incident_type}</TableCell>
                  <TableCell>
                    <SanitarioBadge estado={inc.severity} />
                  </TableCell>
                  <TableCell>
                    <SanitarioBadge estado={inc.status} />
                  </TableCell>
                  <TableCell>{fmt(inc.detected_at)}</TableCell>
                  <TableCell>{fmt(inc.resolved_at)}</TableCell>
                  <TableCell className="text-muted-foreground">{inc.mvz_name ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      )}

      {/* Genealogía */}
      {activeTab === "genealogia" && (
        offspring.length === 0 ? (
          <DetailEmptyState
            icon={GitFork}
            message="Sin crías registradas"
            description="No se han registrado descendientes para este bovino."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Arete SINIIGA</TableHead>
                <TableHead>Sexo</TableHead>
                <TableHead>Nacimiento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Rancho</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offspring.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono font-medium">{o.siniiga_tag}</TableCell>
                  <TableCell>{o.sex === "M" ? "Macho" : "Hembra"}</TableCell>
                  <TableCell>{fmt(o.birth_date)}</TableCell>
                  <TableCell>
                    <SanitarioBadge estado={o.status} />
                  </TableCell>
                  <TableCell>{o.upp_name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      )}

      {/* Vacunaciones */}
      {activeTab === "vacunaciones" && (
        vaccinations.length === 0 ? (
          <DetailEmptyState
            icon={Syringe}
            message="Sin vacunaciones registradas"
            description="No existe historial de vacunación para este bovino."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vacuna</TableHead>
                <TableHead>Dosis</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Aplicada</TableHead>
                <TableHead>Próxima dosis</TableHead>
                <TableHead>MVZ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vaccinations.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.vaccine_name}</TableCell>
                  <TableCell className="text-muted-foreground">{v.dose ?? "—"}</TableCell>
                  <TableCell>
                    <SanitarioBadge estado={v.status} />
                  </TableCell>
                  <TableCell>{fmt(v.applied_at)}</TableCell>
                  <TableCell>{fmt(v.due_at)}</TableCell>
                  <TableCell className="text-muted-foreground">{v.mvz_name ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      )}

      {/* Exportaciones */}
      {activeTab === "exportaciones" && (
        exports.length === 0 ? (
          <DetailEmptyState
            icon={Truck}
            message="Sin solicitudes de exportación"
            description="Este bovino no ha participado en ninguna solicitud de exportación."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estado</TableHead>
                <TableHead>Mes</TableHead>
                <TableHead>Regla 60 días</TableHead>
                <TableHead>TB/BR validado</TableHead>
                <TableHead>Arete azul</TableHead>
                <TableHead>Motivo bloqueo</TableHead>
                <TableHead>Creado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exports.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <SanitarioBadge estado={e.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {e.monthly_bucket ?? "—"}
                  </TableCell>
                  <TableCell>{bool(e.compliance_60_rule)}</TableCell>
                  <TableCell>{bool(e.tb_br_validated)}</TableCell>
                  <TableCell>{bool(e.blue_tag_assigned)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {e.blocked_reason ?? "—"}
                  </TableCell>
                  <TableCell>{fmt(e.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      )}
    </div>
  );
}


