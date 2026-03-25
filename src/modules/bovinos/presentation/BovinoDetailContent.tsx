"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  ClipboardPlus,
  FlaskConical,
  GitFork,
  Loader2,
  MapPin,
  ScrollText,
  Syringe,
  Tag,
  Truck,
  User2,
} from "lucide-react";
import type { Bovino } from "@/modules/bovinos/domain/entities/Bovino";
import type { BovinoExport } from "@/modules/bovinos/domain/entities/BovinoExport";
import type { BovinoFieldTest } from "@/modules/bovinos/domain/entities/BovinoFieldTest";
import type { BovinoSanitaryIncident } from "@/modules/bovinos/domain/entities/BovinoSanitaryIncident";
import type { BovinoVaccination } from "@/modules/bovinos/domain/entities/BovinoVaccination";
import { exportabilityReason } from "@/modules/bovinos/domain/services/checkExportability";
import { buildProjectHref } from "@/modules/workspace/presentation/workspace-routing";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { DetailEmptyState } from "@/shared/ui/detail/DetailEmptyState";
import { DetailHeader } from "@/shared/ui/detail/DetailHeader";
import { DetailInfoGrid } from "@/shared/ui/detail/DetailInfoGrid";
import { DetailTabBar } from "@/shared/ui/detail/DetailTabBar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { ExportableCheckBadge } from "./ExportableCheckBadge";
import { PruebaStatusBadge } from "./PruebaStatusBadge";
import { SanitarioBadge } from "./SanitarioBadge";
import type { BovinoDetailTab } from "./hooks/useBovinoDetail";

interface BovinoDetailContentProps {
  bovino: Bovino | null;
  panel: "producer" | "mvz";
  loading: boolean;
  error: string;
  activeTab: BovinoDetailTab;
  onTabChange: (tab: BovinoDetailTab) => void;
  fieldTests: BovinoFieldTest[];
  incidents: BovinoSanitaryIncident[];
  vaccinations: BovinoVaccination[];
  exports: BovinoExport[];
  offspring: Bovino[];
  backHref: string;
  backLabel: string;
}

function fmt(d: string | null | undefined): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function bool(v: boolean | null): string {
  if (v === null) return "-";
  return v ? "Si" : "No";
}

function formatHealthStatus(status: string | null | undefined): string {
  if (!status) return "-";
  if (status === "healthy") return "Sano";
  if (status === "observation") return "Observacion";
  if (status === "quarantine") return "Cuarentena";
  return status;
}

const TABS = [
  { key: "pruebas", label: "Pruebas TB/BR", icon: FlaskConical },
  { key: "incidentes", label: "Incidentes sanitarios", icon: AlertTriangle },
  { key: "genealogia", label: "Genealogia", icon: GitFork },
  { key: "vacunaciones", label: "Vacunaciones", icon: Syringe },
  { key: "exportaciones", label: "Exportaciones", icon: Truck },
] as const;

export function BovinoDetailContent({
  bovino,
  panel,
  loading,
  error,
  activeTab,
  onTabChange,
  fieldTests,
  incidents,
  vaccinations,
  exports,
  offspring,
  backHref,
  backLabel,
}: Readonly<BovinoDetailContentProps>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
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

  const quickActions =
    panel === "mvz"
      ? [
          {
            label: "Agregar vacuna",
            description: "Abre vacunacion con este animal precargado.",
            href: `${buildProjectHref("mvz", bovino.upp_id, "vacunacion")}?action=nuevo&animalId=${encodeURIComponent(bovino.id)}`,
            icon: Syringe,
          },
          {
            label: "Agregar reporte",
            description: "Abre incidencias con este animal listo para captura.",
            href: `${buildProjectHref("mvz", bovino.upp_id, "incidencias")}?action=nuevo&animalId=${encodeURIComponent(bovino.id)}`,
            icon: ClipboardPlus,
          },
          {
            label: "Ver reportes",
            description: "Consulta el resumen operativo del rancho.",
            href: buildProjectHref("mvz", bovino.upp_id, "reportes"),
            icon: ScrollText,
          },
        ]
      : [
          {
            label: "Ver exportaciones",
            description: "Revisa el seguimiento exportable del proyecto.",
            href: `${buildProjectHref("producer", bovino.upp_id, "exportaciones")}?animalId=${encodeURIComponent(bovino.id)}`,
            icon: Truck,
          },
          {
            label: "Abrir movilizaciones",
            description: "Continua el flujo operativo del rancho con este animal en contexto.",
            href: `${buildProjectHref("producer", bovino.upp_id, "movilizacion")}?animalId=${encodeURIComponent(bovino.id)}`,
            icon: ClipboardPlus,
          },
          {
            label: "Ver documentos",
            description: "Consulta la documentacion del proyecto relacionada al animal.",
            href: `${buildProjectHref("producer", bovino.upp_id, "documentos")}?animalId=${encodeURIComponent(bovino.id)}`,
            icon: ScrollText,
          },
        ];

  const infoItems = [
    {
      label: "Arete SINIIGA",
      value: <span className="font-mono">{bovino.siniiga_tag}</span>,
      icon: Tag,
    },
    {
      label: "Nombre",
      value: bovino.name || "-",
      icon: User2,
    },
    {
      label: "Sexo",
      value: bovino.sex === "M" ? "Macho" : "Hembra",
      icon: User2,
    },
    {
      label: "Fecha de nacimiento",
      value: fmt(bovino.birth_date),
      icon: CalendarDays,
    },
    {
      label: "Raza",
      value: bovino.breed || "-",
      icon: Tag,
    },
    {
      label: "Edad",
      value: bovino.age_years != null ? `${bovino.age_years} ano(s)` : "-",
      icon: CalendarDays,
    },
    {
      label: "Peso",
      value: bovino.weight_kg != null ? `${bovino.weight_kg.toFixed(1)} kg` : "-",
      icon: Activity,
    },
    {
      label: "Estado de salud",
      value: bovino.health_status ? <SanitarioBadge estado={bovino.health_status} /> : "-",
      icon: Activity,
    },
    {
      label: "Ultima vacuna",
      value: fmt(bovino.last_vaccine_at),
      icon: Syringe,
    },
    {
      label: "Madre",
      value: bovino.mother_animal_id ? (
        <span className="font-mono text-xs">{bovino.mother_animal_id}</span>
      ) : (
        "-"
      ),
      icon: GitFork,
    },
    {
      label: "Rancho (UPP)",
      value: bovino.upp_name || "-",
      icon: MapPin,
    },
    {
      label: "Clave UPP",
      value: bovino.upp_code || "-",
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
    {
      label: "Collar actual",
      value: bovino.current_collar_id ? (
        <div className="space-y-1">
          <div className="font-mono text-xs">{bovino.current_collar_id}</div>
          <div className="text-xs text-muted-foreground">{fmt(bovino.current_collar_linked_at)}</div>
        </div>
      ) : (
        "-"
      ),
      icon: Tag,
    },
    {
      label: "Estado del collar",
      value: bovino.current_collar_status ? (
        <SanitarioBadge estado={bovino.current_collar_status} />
      ) : (
        "-"
      ),
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-6">
      <DetailHeader
        title={bovino.name ? `${bovino.name} / ${bovino.siniiga_tag}` : bovino.siniiga_tag}
        subtitle={`${bovino.upp_name}${bovino.upp_code ? ` (${bovino.upp_code})` : ""}`}
        backHref={backHref}
        backLabel={backLabel}
        status={bovino.status}
        statusLabel={bovino.status}
        statusVariant={bovino.status === "active" ? "active" : "inactive"}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {quickActions.map(({ label, description, href, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="rounded-full border border-border bg-muted/60 p-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-base">{label}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{description}</p>
              <Button asChild size="sm">
                <Link href={href}>Abrir</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">TB:</span>
          <PruebaStatusBadge
            status={bovino.sanitary.tb_status ?? "sin_prueba"}
            result={bovino.sanitary.tb_result}
            label="Tuberculosis"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">BR:</span>
          <PruebaStatusBadge
            status={bovino.sanitary.br_status ?? "sin_prueba"}
            result={bovino.sanitary.br_result}
            label="Brucelosis"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Salud:</span>
          <span className="text-sm">{formatHealthStatus(bovino.health_status)}</span>
        </div>
        {bovino.current_collar_id ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Collar:</span>
            <span className="font-mono text-xs">{bovino.current_collar_id}</span>
          </div>
        ) : null}
        <ExportableCheckBadge
          canExport={bovino.canExport}
          reason={bovino.canExport ? undefined : exportabilityReason(bovino)}
        />
      </div>

      <DetailInfoGrid items={infoItems} columns={3} />

      <DetailTabBar
        tabs={[...TABS]}
        active={activeTab}
        onChange={(tab) => onTabChange(tab as BovinoDetailTab)}
      />

      {activeTab === "pruebas" &&
        (fieldTests.length === 0 ? (
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
                <TableHead>Valido hasta</TableHead>
                <TableHead>MVZ</TableHead>
                <TableHead>Capturado en</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fieldTests.map((fieldTest) => (
                <TableRow key={fieldTest.id}>
                  <TableCell className="font-medium uppercase">{fieldTest.test_type_key}</TableCell>
                  <TableCell>{fmt(fieldTest.sample_date)}</TableCell>
                  <TableCell>
                    <SanitarioBadge estado={fieldTest.result} />
                  </TableCell>
                  <TableCell>{fmt(fieldTest.valid_until)}</TableCell>
                  <TableCell className="text-muted-foreground">{fieldTest.mvz_name ?? "-"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {fieldTest.captured_lat != null && fieldTest.captured_lng != null
                      ? `${fieldTest.captured_lat.toFixed(4)}, ${fieldTest.captured_lng.toFixed(4)}`
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ))}

      {activeTab === "incidentes" &&
        (incidents.length === 0 ? (
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
              {incidents.map((incident) => (
                <TableRow key={incident.id}>
                  <TableCell>{incident.incident_type}</TableCell>
                  <TableCell>
                    <SanitarioBadge estado={incident.severity} />
                  </TableCell>
                  <TableCell>
                    <SanitarioBadge estado={incident.status} />
                  </TableCell>
                  <TableCell>{fmt(incident.detected_at)}</TableCell>
                  <TableCell>{fmt(incident.resolved_at)}</TableCell>
                  <TableCell className="text-muted-foreground">{incident.mvz_name ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ))}

      {activeTab === "genealogia" &&
        (offspring.length === 0 ? (
          <DetailEmptyState
            icon={GitFork}
            message="Sin crias registradas"
            description="No se han registrado descendientes para este bovino."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Arete SINIIGA</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Sexo</TableHead>
                <TableHead>Nacimiento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Rancho</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offspring.map((offspringAnimal) => (
                <TableRow key={offspringAnimal.id}>
                  <TableCell className="font-mono font-medium">{offspringAnimal.siniiga_tag}</TableCell>
                  <TableCell>
                    <div className="font-medium">{offspringAnimal.name ?? "Sin nombre"}</div>
                    <div className="text-xs text-muted-foreground">{offspringAnimal.breed ?? "-"}</div>
                  </TableCell>
                  <TableCell>{offspringAnimal.sex === "M" ? "Macho" : "Hembra"}</TableCell>
                  <TableCell>{fmt(offspringAnimal.birth_date)}</TableCell>
                  <TableCell>
                    <SanitarioBadge estado={offspringAnimal.status} />
                  </TableCell>
                  <TableCell>{offspringAnimal.upp_name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ))}

      {activeTab === "vacunaciones" &&
        (vaccinations.length === 0 ? (
          <DetailEmptyState
            icon={Syringe}
            message="Sin vacunaciones registradas"
            description="No existe historial de vacunacion para este bovino."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vacuna</TableHead>
                <TableHead>Dosis</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Aplicada</TableHead>
                <TableHead>Proxima dosis</TableHead>
                <TableHead>MVZ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vaccinations.map((vaccination) => (
                <TableRow key={vaccination.id}>
                  <TableCell className="font-medium">{vaccination.vaccine_name}</TableCell>
                  <TableCell className="text-muted-foreground">{vaccination.dose ?? "-"}</TableCell>
                  <TableCell>
                    <SanitarioBadge estado={vaccination.status} />
                  </TableCell>
                  <TableCell>{fmt(vaccination.applied_at)}</TableCell>
                  <TableCell>{fmt(vaccination.due_at)}</TableCell>
                  <TableCell className="text-muted-foreground">{vaccination.mvz_name ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ))}

      {activeTab === "exportaciones" &&
        (exports.length === 0 ? (
          <DetailEmptyState
            icon={Truck}
            message="Sin solicitudes de exportacion"
            description="Este bovino no ha participado en ninguna solicitud de exportacion."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estado</TableHead>
                <TableHead>Mes</TableHead>
                <TableHead>Regla 60 dias</TableHead>
                <TableHead>TB/BR validado</TableHead>
                <TableHead>Arete azul</TableHead>
                <TableHead>Motivo bloqueo</TableHead>
                <TableHead>Creado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exports.map((exportRequest) => (
                <TableRow key={exportRequest.id}>
                  <TableCell>
                    <SanitarioBadge estado={exportRequest.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {exportRequest.monthly_bucket ?? "-"}
                  </TableCell>
                  <TableCell>{bool(exportRequest.compliance_60_rule)}</TableCell>
                  <TableCell>{bool(exportRequest.tb_br_validated)}</TableCell>
                  <TableCell>{bool(exportRequest.blue_tag_assigned)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {exportRequest.blocked_reason ?? "-"}
                  </TableCell>
                  <TableCell>{fmt(exportRequest.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ))}
    </div>
  );
}
