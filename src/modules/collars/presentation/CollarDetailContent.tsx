"use client";

import { Zap, LinkIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  DetailInfoGrid,
} from "@/shared/ui";
import { CollarStatusBadge } from "./CollarStatusBadge";
import type { useCollarDetail } from "./hooks/useCollarDetail";

type Props = ReturnType<typeof useCollarDetail>;

export function CollarDetailContent({
  detail,
  loading,
  error,
  linkedAnimal,
  linkedProducer,
  history,
  isSavingStatus,
  handleStatusChange,
}: Readonly<Props>) {
  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-12 w-48 bg-muted rounded animate-pulse" />
        <div className="h-8 w-80 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!detail) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <LinkIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            El collar no fue encontrado
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with status and actions */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold font-mono">{detail.collar_id}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Collar ID: {detail.id}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CollarStatusBadge status={detail.status} />
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              handleStatusChange(
                detail.status === "active" ? "inactive" : "active"
              )
            }
            disabled={isSavingStatus}
          >
            {isSavingStatus
              ? "Guardando..."
              : detail.status === "active"
                ? "Desactivar"
                : "Activar"}
          </Button>
        </div>
      </div>

      {/* Información General */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información del Collar</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailInfoGrid
            items={[
              {
                label: "Collar ID",
                value: (
                  <code className="font-mono font-medium text-sm">
                    {detail.collar_id}
                  </code>
                ),
              },
              {
                label: "Estado",
                value: <CollarStatusBadge status={detail.status} />,
              },
              {
                label: "Firmware",
                value: (
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">{detail.firmware_version}</span>
                  </div>
                ),
              },
              {
                label: "Vinculado",
                value: detail.linked_at
                  ? new Date(detail.linked_at).toLocaleDateString("es-MX")
                  : "—",
              },
              {
                label: "Comprado",
                value: detail.purchased_at
                  ? new Date(detail.purchased_at).toLocaleDateString("es-MX")
                  : "—",
              },
              {
                label: "Creado",
                value: new Date(detail.created_at).toLocaleDateString("es-MX"),
              },
            ]}
          />
        </CardContent>
      </Card>

      {/* Animal Vinculado */}
      {linkedAnimal ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Animal Vinculado</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailInfoGrid
              items={[
                { label: "ID", value: linkedAnimal.id },
                { label: "Nombre", value: linkedAnimal.name },
              ]}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-sm text-muted-foreground">
              Sin animal vinculado
            </p>
          </CardContent>
        </Card>
      )}

      {/* Productor Asignado */}
      {linkedProducer ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Productor Asignado</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailInfoGrid
              items={[
                { label: "ID", value: linkedProducer.id },
                { label: "Nombre", value: linkedProducer.fullName },
              ]}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-sm text-muted-foreground">
              Sin productor asignado
            </p>
          </CardContent>
        </Card>
      )}

      {/* Historial */}
      {history && history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historial de Vinculaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="border-l-2 border-muted pl-4 py-2"
                >
                  <p className="text-sm font-medium">Animal: {entry.animal_id}</p>
                  <p className="text-xs text-muted-foreground">
                    Vinculado:{" "}
                    {new Date(entry.linked_at).toLocaleDateString("es-MX")}
                  </p>
                  {entry.unlinked_at && (
                    <p className="text-xs text-muted-foreground">
                      Desvinculado:{" "}
                      {new Date(entry.unlinked_at).toLocaleDateString("es-MX")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
