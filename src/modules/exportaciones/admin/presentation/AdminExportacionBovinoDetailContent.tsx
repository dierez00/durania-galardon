"use client";

import {
  Tag,
  Calendar,
  Activity,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import { cn } from "@/shared/lib/utils";
import { DetailInfoGrid } from "@/shared/ui/detail/DetailInfoGrid";
import { toneClass, toneToBadgeVariant, type SemanticTone } from "@/shared/ui/theme";
import type { AdminExportacionAnimalDetail } from "@/modules/exportaciones/admin/domain/entities/AdminExportacionAnimalEntity";

interface Props {
  exportId: string;
  animal: AdminExportacionAnimalDetail;
}

const TEST_RESULT_BADGE: Record<string, { label: string; tone: SemanticTone; icon: typeof CheckCircle2 }> = {
  negativo: { label: "Negativo", tone: "success", icon: CheckCircle2 },
  positivo: { label: "Positivo", tone: "error", icon: XCircle },
};

function sexLabel(sex: string): string {
  if (sex === "M") return "Macho";
  if (sex === "F") return "Hembra";
  return sex;
}

function ResultBadge({ result }: Readonly<{ result: string | null }>) {
  if (!result) return <span className="text-muted-foreground">â€”</span>;
  const cfg = TEST_RESULT_BADGE[result.toLowerCase()] ?? {
    label: result,
    tone: "neutral" as SemanticTone,
    icon: Activity,
  };
  const Icon = cfg.icon;
  return (
    <Badge variant={toneToBadgeVariant[cfg.tone]} className="text-xs flex items-center gap-1 w-fit">
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
}

function TestValidityChip({ validUntil }: Readonly<{ validUntil: string | null }>) {
  if (!validUntil) return <span className="text-muted-foreground">â€”</span>;
  const today = new Date();
  const expiry = new Date(validUntil);
  const days = Math.floor((expiry.getTime() - today.getTime()) / 86400000);

  if (days < 0) {
    return (
      <span className={cn("text-xs flex items-center gap-1", toneClass("error", "text"))}>
        <XCircle className="w-3 h-3" />
        Vencida ({new Date(validUntil).toLocaleDateString("es-MX")})
      </span>
    );
  }
  if (days <= 30) {
    return (
      <span className={cn("text-xs flex items-center gap-1", toneClass("warning", "text"))}>
        <Clock className="w-3 h-3" />
        {new Date(validUntil).toLocaleDateString("es-MX")} ({days}d)
      </span>
    );
  }
  return (
    <span className={cn("text-xs flex items-center gap-1", toneClass("success", "text"))}>
      <CheckCircle2 className="w-3 h-3" />
      {new Date(validUntil).toLocaleDateString("es-MX")}
    </span>
  );
}

export function AdminExportacionBovinoDetailContent({ exportId, animal }: Readonly<Props>) {
  const latestTb = animal.tests.find((t) => t.testTypeKey === "tb") ?? null;
  const latestBr = animal.tests.find((t) => t.testTypeKey === "br") ?? null;

  const ageText = animal.birthDate
    ? (() => {
        const months = Math.floor(
          (Date.now() - new Date(animal.birthDate).getTime()) / (30.44 * 86400000)
        );
        return months >= 12 ? `${Math.floor(months / 12)} aÃ±o(s)` : `${months} mes(es)`;
      })()
    : null;

  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border">
        <Link href={`/admin/exports/${exportId}`}>
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="w-4 h-4" />
            ExportaciÃ³n
          </Button>
        </Link>
        <div>
          <h1 className="text-lg font-semibold">
            Bovino â€” {animal.siniigaTag}
          </h1>
          {animal.uppName && (
            <p className="text-sm text-muted-foreground">{animal.uppName}</p>
          )}
        </div>
        <div className="ml-auto">
          <Badge variant={toneToBadgeVariant[animal.status === "active" ? "success" : "neutral"]}>
            {animal.status === "active" ? "Activo" : "Inactivo"}
          </Badge>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Datos generales */}
        <DetailInfoGrid
          columns={3}
          items={[
            { label: "Arete SINIIGA", icon: Tag, value: animal.siniigaTag },
            {
              label: "Sexo",
              icon: Tag,
              value: sexLabel(animal.sex),
            },
            { label: "Edad", icon: Calendar, value: ageText ?? "â€”" },
            {
              label: "Fecha de nacimiento",
              icon: Calendar,
              value: animal.birthDate
                ? new Date(animal.birthDate).toLocaleDateString("es-MX")
                : null,
            },
            { label: "UPP", icon: Activity, value: animal.uppName ?? "â€”" },
            {
              label: "Madre (ID)",
              icon: Tag,
              value: animal.motherAnimalId
                ? <span className="font-mono text-xs">{animal.motherAnimalId.slice(0, 8)}â€¦</span>
                : null,
            },
          ]}
        />

        {/* Resumen sanitario */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className={cn("w-4 h-4", toneClass("info", "icon"))} />
                Tuberculosis (TB) â€” Ãºltima prueba
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
                    <span className="text-xs">
                      {new Date(latestTb.sampleDate).toLocaleDateString("es-MX")}
                    </span>
                  </div>
                  {latestTb.mvzFullName && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">MVZ</span>
                      <span className="text-xs">{latestTb.mvzFullName}</span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className={cn("w-4 h-4", toneClass("warning", "icon"))} />
                  Sin pruebas de tuberculosis
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className={cn("w-4 h-4", toneClass("accent", "icon"))} />
                Brucelosis (BR) â€” Ãºltima prueba
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
                    <span className="text-xs">
                      {new Date(latestBr.sampleDate).toLocaleDateString("es-MX")}
                    </span>
                  </div>
                  {latestBr.mvzFullName && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">MVZ</span>
                      <span className="text-xs">{latestBr.mvzFullName}</span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className={cn("w-4 h-4", toneClass("warning", "icon"))} />
                  Sin pruebas de brucelosis
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Historial completo de pruebas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Historial de pruebas ({animal.tests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {animal.tests.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Sin pruebas registradas.</p>
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
                  {animal.tests.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <Badge variant="info" className="text-xs uppercase">
                          {t.testTypeKey}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(t.sampleDate).toLocaleDateString("es-MX")}
                      </TableCell>
                      <TableCell>
                        <ResultBadge result={t.result} />
                      </TableCell>
                      <TableCell>
                        <TestValidityChip validUntil={t.validUntil} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.mvzFullName ?? "â€”"}
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
  );
}

