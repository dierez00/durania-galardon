"use client";

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldPlus,
  Syringe,
  Tag,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { DetailInfoGrid } from "@/shared/ui/detail/DetailInfoGrid";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { cn } from "@/shared/lib/utils";
import { toneClass, toneToBadgeVariant, type SemanticTone } from "@/shared/ui/theme";
import type { AdminExportacionAnimalDetail } from "@/modules/exportaciones/admin/domain/entities/AdminExportacionAnimalEntity";

interface Props {
  exportId: string;
  animal: AdminExportacionAnimalDetail;
}

const TEST_RESULT_BADGE: Record<string, { label: string; tone: SemanticTone; icon: typeof CheckCircle2 }> = {
  negative: { label: "Negativo", tone: "success", icon: CheckCircle2 },
  positive: { label: "Positivo", tone: "error", icon: XCircle },
};

function sexLabel(sex: string): string {
  if (sex === "M") return "Macho";
  if (sex === "F") return "Hembra";
  return sex;
}

function healthStatusLabel(status: string | null): string {
  if (!status) return "-";
  if (status === "healthy") return "Sano";
  if (status === "observation") return "Observacion";
  if (status === "quarantine") return "Cuarentena";
  return status;
}

function ResultBadge({ result }: Readonly<{ result: string | null }>) {
  if (!result) return <span className="text-muted-foreground">-</span>;
  const cfg = TEST_RESULT_BADGE[result.toLowerCase()] ?? {
    label: result,
    tone: "neutral" as SemanticTone,
    icon: Activity,
  };
  const Icon = cfg.icon;
  return (
    <Badge variant={toneToBadgeVariant[cfg.tone]} className="flex w-fit items-center gap-1 text-xs">
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}

function TestValidityChip({ validUntil }: Readonly<{ validUntil: string | null }>) {
  if (!validUntil) return <span className="text-muted-foreground">-</span>;

  const today = new Date();
  const expiry = new Date(validUntil);
  const days = Math.floor((expiry.getTime() - today.getTime()) / 86400000);

  if (days < 0) {
    return (
      <span className={cn("flex items-center gap-1 text-xs", toneClass("error", "text"))}>
        <XCircle className="h-3 w-3" />
        Vencida ({new Date(validUntil).toLocaleDateString("es-MX")})
      </span>
    );
  }

  if (days <= 30) {
    return (
      <span className={cn("flex items-center gap-1 text-xs", toneClass("warning", "text"))}>
        <Clock className="h-3 w-3" />
        {new Date(validUntil).toLocaleDateString("es-MX")} ({days}d)
      </span>
    );
  }

  return (
    <span className={cn("flex items-center gap-1 text-xs", toneClass("success", "text"))}>
      <CheckCircle2 className="h-3 w-3" />
      {new Date(validUntil).toLocaleDateString("es-MX")}
    </span>
  );
}

export function AdminExportacionBovinoDetailContent({ exportId, animal }: Readonly<Props>) {
  const latestTb = animal.tests.find((test) => test.testTypeKey === "tb") ?? null;
  const latestBr = animal.tests.find((test) => test.testTypeKey === "br") ?? null;

  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center gap-4 border-b border-border px-6 py-4">
        <Link href={`/admin/exports/${exportId}`}>
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Exportacion
          </Button>
        </Link>
        <div>
          <h1 className="text-lg font-semibold">
            {animal.name ? `${animal.name} · ${animal.siniigaTag}` : `Bovino · ${animal.siniigaTag}`}
          </h1>
          <p className="text-sm text-muted-foreground">
            {animal.uppName ?? "-"}
            {animal.uppCode ? ` (${animal.uppCode})` : ""}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {animal.currentCollarId ? (
            <Badge variant="secondary" className="font-mono text-xs">
              {animal.currentCollarId}
            </Badge>
          ) : null}
          <Badge variant={toneToBadgeVariant[animal.status === "active" ? "success" : "neutral"]}>
            {animal.status === "active" ? "Activo" : "Inactivo"}
          </Badge>
        </div>
      </div>

      <div className="space-y-6 px-6 py-6">
        <DetailInfoGrid
          columns={3}
          items={[
            { label: "Arete SINIIGA", icon: Tag, value: animal.siniigaTag },
            { label: "Nombre", icon: Tag, value: animal.name ?? "-" },
            { label: "Sexo", icon: Tag, value: sexLabel(animal.sex) },
            {
              label: "Fecha de nacimiento",
              icon: Calendar,
              value: animal.birthDate ? new Date(animal.birthDate).toLocaleDateString("es-MX") : "-",
            },
            { label: "Raza", icon: Tag, value: animal.breed ?? "-" },
            { label: "Edad", icon: Calendar, value: animal.ageYears != null ? `${animal.ageYears} ano(s)` : "-" },
            {
              label: "Peso",
              icon: Activity,
              value: animal.weightKg != null ? `${animal.weightKg.toFixed(1)} kg` : "-",
            },
            { label: "Estado de salud", icon: ShieldPlus, value: healthStatusLabel(animal.healthStatus) },
            {
              label: "Ultima vacuna",
              icon: Syringe,
              value: animal.lastVaccineAt ? new Date(animal.lastVaccineAt).toLocaleString("es-MX") : "-",
            },
            { label: "UPP", icon: Activity, value: animal.uppName ?? "-" },
            { label: "Clave UPP", icon: Tag, value: animal.uppCode ?? "-" },
            {
              label: "Madre (ID)",
              icon: Tag,
              value: animal.motherAnimalId ? (
                <span className="font-mono text-xs">{animal.motherAnimalId}</span>
              ) : (
                "-"
              ),
            },
            { label: "Collar actual", icon: Tag, value: animal.currentCollarId ?? "-" },
            { label: "Estado collar", icon: Activity, value: animal.currentCollarStatus ?? "-" },
            {
              label: "Vinculado desde",
              icon: Calendar,
              value: animal.currentCollarLinkedAt
                ? new Date(animal.currentCollarLinkedAt).toLocaleString("es-MX")
                : "-",
            },
          ]}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Activity className={cn("h-4 w-4", toneClass("info", "icon"))} />
                Tuberculosis (TB)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {latestTb ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Resultado</span>
                    <ResultBadge result={latestTb.result} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Vigencia</span>
                    <TestValidityChip validUntil={latestTb.validUntil} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Fecha</span>
                    <span className="text-xs">{new Date(latestTb.sampleDate).toLocaleDateString("es-MX")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">MVZ</span>
                    <span className="text-xs">{latestTb.mvzFullName ?? "-"}</span>
                  </div>
                </>
              ) : (
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <AlertTriangle className={cn("h-4 w-4", toneClass("warning", "icon"))} />
                  Sin pruebas de tuberculosis
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Activity className={cn("h-4 w-4", toneClass("accent", "icon"))} />
                Brucelosis (BR)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {latestBr ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Resultado</span>
                    <ResultBadge result={latestBr.result} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Vigencia</span>
                    <TestValidityChip validUntil={latestBr.validUntil} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Fecha</span>
                    <span className="text-xs">{new Date(latestBr.sampleDate).toLocaleDateString("es-MX")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">MVZ</span>
                    <span className="text-xs">{latestBr.mvzFullName ?? "-"}</span>
                  </div>
                </>
              ) : (
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <AlertTriangle className={cn("h-4 w-4", toneClass("warning", "icon"))} />
                  Sin pruebas de brucelosis
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Historial de pruebas ({animal.tests.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {animal.tests.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Sin pruebas registradas.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Vigente hasta</TableHead>
                    <TableHead>MVZ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {animal.tests.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell>
                        <Badge variant="info" className="text-xs uppercase">
                          {test.testTypeKey}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(test.sampleDate).toLocaleDateString("es-MX")}
                      </TableCell>
                      <TableCell>
                        <ResultBadge result={test.result} />
                      </TableCell>
                      <TableCell>
                        <TestValidityChip validUntil={test.validUntil} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{test.mvzFullName ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Vacunaciones ({animal.vaccinations.length})</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {animal.vaccinations.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">Sin vacunaciones registradas.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vacuna</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Aplicada</TableHead>
                      <TableHead>MVZ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {animal.vaccinations.map((vaccination) => (
                      <TableRow key={vaccination.id}>
                        <TableCell className="font-medium">{vaccination.vaccineName}</TableCell>
                        <TableCell>{vaccination.status}</TableCell>
                        <TableCell>
                          {vaccination.appliedAt
                            ? new Date(vaccination.appliedAt).toLocaleDateString("es-MX")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {vaccination.mvzFullName ?? "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Incidencias ({animal.incidents.length})</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {animal.incidents.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">Sin incidencias registradas.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Detectada</TableHead>
                      <TableHead>MVZ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {animal.incidents.map((incident) => (
                      <TableRow key={incident.id}>
                        <TableCell className="font-medium">{incident.incidentType}</TableCell>
                        <TableCell>{incident.status}</TableCell>
                        <TableCell>{new Date(incident.detectedAt).toLocaleDateString("es-MX")}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {incident.mvzFullName ?? "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
