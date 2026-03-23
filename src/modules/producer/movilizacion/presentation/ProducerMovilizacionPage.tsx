"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { getAccessToken } from "@/shared/lib/auth-session";
import { useProducerUppContext } from "@/modules/producer/ranchos/presentation";
import { useDocumentUpload } from "@/modules/producer/documents/presentation";
import { UPP_MOVILIZACION_BOVINO_DOCUMENT_TYPES } from "@/modules/producer/documents/domain/entities/UppDocumentEntity";

interface MovementRow {
  id: string;
  upp_id: string | null;
  status: string;
  qr_code: string | null;
  route_note: string | null;
  incidence_note: string | null;
  movement_date: string | null;
  created_at: string;
}

interface SanitaryAnimal {
  animalId: string;
  siniigaTag: string;
  passed: boolean;
  reasons: string[];
}

interface SanitaryValidation {
  passed: boolean;
  hasActiveQuarantine: boolean;
  animals: SanitaryAnimal[];
}

interface AnimalUploadState {
  docType: string;
  expiryDate: string;
  file: File | null;
}

const STATUS_LABELS: Record<string, string> = {
  requested: "Solicitado",
  approved: "Aprobado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
};

function movementStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "approved") return "default";
  if (status === "rejected" || status === "cancelled") return "destructive";
  return "secondary";
}

export default function ProducerMovilizacionPage() {
  const { upps, selectedUppId, selectedUpp } = useProducerUppContext();
  const { uploadUppDocument } = useDocumentUpload();
  const [rows, setRows] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [formUppId, setFormUppId] = useState("");
  const [movementDate, setMovementDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [routeNote, setRouteNote] = useState("");
  const [destinationText, setDestinationText] = useState("");
  const [authorizedTags, setAuthorizedTags] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmMovementId, setConfirmMovementId] = useState("");
  const [confirmDestinationType, setConfirmDestinationType] = useState<"internal" | "external">("internal");
  const [confirmDestinationUppId, setConfirmDestinationUppId] = useState("");
  const [receivedTags, setReceivedTags] = useState("");
  const [incidenceNote, setIncidenceNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sanitaryValidation, setSanitaryValidation] = useState<SanitaryValidation | null>(null);
  const [animalUploads, setAnimalUploads] = useState<Record<string, AnimalUploadState>>({});

  useEffect(() => {
    if (selectedUppId && !formUppId) setFormUppId(selectedUppId);
  }, [selectedUppId, formUppId]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      setLoading(false);
      return;
    }

    const params = selectedUppId ? `?uppId=${encodeURIComponent(selectedUppId)}` : "";
    const response = await fetch(`/api/producer/movements${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible cargar historial de movilizaciones.");
      setLoading(false);
      return;
    }

    setRows(body.data.movements ?? []);
    setLoading(false);
  }, [selectedUppId]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const createMovement = async () => {
    if (!formUppId) return;
    setSubmitting(true);
    setErrorMessage("");
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      setSubmitting(false);
      return;
    }

    const response = await fetch("/api/producer/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        uppId: formUppId,
        movementDate: movementDate || undefined,
        validUntil: validUntil || undefined,
        routeNote: routeNote || undefined,
        destinationText: destinationText || undefined,
        authorizedTags: authorizedTags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      }),
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible crear solicitud de movilizacion.");
      setSubmitting(false);
      return;
    }

    setSanitaryValidation((body.data?.sanitaryValidation as SanitaryValidation | undefined) ?? null);

    setMovementDate("");
    setValidUntil("");
    setRouteNote("");
    setDestinationText("");
    setAuthorizedTags("");
    setSubmitting(false);
    await loadRows();
  };

  const updateAnimalUpload = (animalId: string, patch: Partial<AnimalUploadState>) => {
    setAnimalUploads((previous) => ({
      ...previous,
      [animalId]: {
        docType: previous[animalId]?.docType ?? "",
        expiryDate: previous[animalId]?.expiryDate ?? "",
        file: previous[animalId]?.file ?? null,
        ...patch,
      },
    }));
  };

  const handleBovinoDocumentUpload = async (animalId: string) => {
    if (!formUppId) {
      setErrorMessage("Debe seleccionar una UPP para subir documentos por bovino.");
      return;
    }

    const uploadState = animalUploads[animalId];
    if (!uploadState?.file || !uploadState.docType) {
      setErrorMessage("Seleccione tipo de documento y archivo antes de subir.");
      return;
    }

    const docType = UPP_MOVILIZACION_BOVINO_DOCUMENT_TYPES.find((item) => item.key === uploadState.docType);
    if (docType?.requiresExpiry && !uploadState.expiryDate) {
      setErrorMessage("Debe proporcionar fecha de vigencia para este tipo de documento.");
      return;
    }

    try {
      setErrorMessage("");
      await uploadUppDocument(
        uploadState.file,
        formUppId,
        uploadState.docType,
        uploadState.expiryDate || undefined,
        animalId
      );
      updateAnimalUpload(animalId, { file: null, expiryDate: "" });
    } catch {
      // useDocumentUpload handles toast and message.
    }
  };

  const confirmArrival = async () => {
    if (!confirmMovementId) return;
    setConfirming(true);
    setErrorMessage("");

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("No existe sesion activa.");
      setConfirming(false);
      return;
    }

    const response = await fetch("/api/producer/movements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        movementId: confirmMovementId,
        destinationType: confirmDestinationType,
        destinationUppId: confirmDestinationType === "internal" ? confirmDestinationUppId || undefined : undefined,
        receivedTags: receivedTags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        incidenceNote: incidenceNote || undefined,
      }),
    });

    const body = await response.json();
    if (!response.ok || !body.ok) {
      setErrorMessage(body.error?.message ?? "No fue posible confirmar la llegada de ganado.");
      setConfirming(false);
      return;
    }

    setConfirmMovementId("");
    setConfirmDestinationUppId("");
    setReceivedTags("");
    setIncidenceNote("");
    setConfirming(false);
    await loadRows();
  };

  const uppName = (uppId: string | null) => {
    if (!uppId) return "-";
    return upps.find((upp) => upp.id === uppId)?.name ?? uppId.slice(0, 8);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Movilizacion (REEMO)</h1>
        <p className="text-sm text-muted-foreground">
          {selectedUpp ? `Rancho: ${selectedUpp.name}` : "Solicitud y seguimiento de movilizacion ganadera."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nueva solicitud de movilizacion</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="formUppId">Rancho (UPP)</Label>
            <Select value={formUppId} onValueChange={setFormUppId}>
              <SelectTrigger id="formUppId">
                <SelectValue placeholder="Seleccionar rancho..." />
              </SelectTrigger>
              <SelectContent>
                {upps.map((upp) => (
                  <SelectItem key={upp.id} value={upp.id}>
                    {upp.name} {upp.upp_code ? `(${upp.upp_code})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="movementDate">Fecha de movimiento</Label>
            <Input
              id="movementDate"
              type="date"
              value={movementDate}
              onChange={(event) => setMovementDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="validUntil">Vigencia del pase</Label>
            <Input
              id="validUntil"
              type="date"
              value={validUntil}
              onChange={(event) => setValidUntil(event.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="destinationText">Destino</Label>
            <Input
              id="destinationText"
              value={destinationText}
              placeholder="Rastro / corral / UPP destino"
              onChange={(event) => setDestinationText(event.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="authorizedTags">Aretes autorizados</Label>
            <Textarea
              id="authorizedTags"
              value={authorizedTags}
              placeholder="MX-DGO-001-0001, MX-DGO-001-0002"
              onChange={(event) => setAuthorizedTags(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="routeNote">Nota de ruta</Label>
            <Input
              id="routeNote"
              value={routeNote}
              placeholder="Opcional"
              onChange={(event) => setRouteNote(event.target.value)}
            />
          </div>
          <div className="md:col-span-3">
            <Button onClick={createMovement} disabled={!formUppId || submitting || !authorizedTags.trim()}>
              {submitting ? "Enviando..." : "Solicitar movilizacion"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Confirmar llegada e inventario</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="confirmMovementId">Solicitud</Label>
            <Select value={confirmMovementId} onValueChange={setConfirmMovementId}>
              <SelectTrigger id="confirmMovementId">
                <SelectValue placeholder="Seleccionar solicitud..." />
              </SelectTrigger>
              <SelectContent>
                {rows.map((row) => (
                  <SelectItem key={row.id} value={row.id}>
                    {row.id.slice(0, 8)} - {uppName(row.upp_id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmDestinationType">Destino</Label>
            <Select value={confirmDestinationType} onValueChange={(value) => setConfirmDestinationType(value as "internal" | "external")}>
              <SelectTrigger id="confirmDestinationType">
                <SelectValue placeholder="Tipo de destino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">UPP interna</SelectItem>
                <SelectItem value="external">Rastro / corral externo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {confirmDestinationType === "internal" ? (
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="confirmDestinationUppId">UPP destino interna</Label>
              <Select value={confirmDestinationUppId} onValueChange={setConfirmDestinationUppId}>
                <SelectTrigger id="confirmDestinationUppId">
                  <SelectValue placeholder="Seleccionar UPP destino..." />
                </SelectTrigger>
                <SelectContent>
                  {upps.map((upp) => (
                    <SelectItem key={upp.id} value={upp.id}>
                      {upp.name} {upp.upp_code ? `(${upp.upp_code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="receivedTags">Aretes recibidos</Label>
            <Textarea
              id="receivedTags"
              value={receivedTags}
              placeholder="MX-DGO-001-0001, MX-DGO-001-0002"
              onChange={(event) => setReceivedTags(event.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="incidenceNote">Incidencias (opcional)</Label>
            <Textarea
              id="incidenceNote"
              value={incidenceNote}
              placeholder="Detalles de diferencias en recepción"
              onChange={(event) => setIncidenceNote(event.target.value)}
            />
          </div>
          <div className="md:col-span-3">
            <Button
              onClick={confirmArrival}
              disabled={
                confirming ||
                !confirmMovementId ||
                !receivedTags.trim() ||
                (confirmDestinationType === "internal" && !confirmDestinationUppId)
              }
            >
              {confirming ? "Confirmando..." : "Confirmar llegada"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {sanitaryValidation?.passed ? (
        <Card>
          <CardHeader>
            <CardTitle>Documentos por bovino validado</CardTitle>
            <p className="text-sm text-muted-foreground">
              Esta sección se habilita solo después de validación sanitaria aprobada para movilización.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {sanitaryValidation.animals.filter((animal) => animal.passed).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No se encontraron bovinos validados para carga documental.
              </p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {sanitaryValidation.animals
                  .filter((animal) => animal.passed)
                  .map((animal) => {
                    const state = animalUploads[animal.animalId] ?? {
                      docType: "",
                      expiryDate: "",
                      file: null,
                    };
                    const selectedDocType = UPP_MOVILIZACION_BOVINO_DOCUMENT_TYPES.find(
                      (item) => item.key === state.docType
                    );

                    return (
                      <Card key={animal.animalId}>
                        <CardHeader className="space-y-1 pb-3">
                          <CardTitle className="text-base">{animal.siniigaTag}</CardTitle>
                          <p className="text-xs text-muted-foreground">Bovino validado para movilización</p>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor={`docType-${animal.animalId}`}>Tipo de documento</Label>
                            <Select
                              value={state.docType}
                              onValueChange={(value) => updateAnimalUpload(animal.animalId, { docType: value })}
                            >
                              <SelectTrigger id={`docType-${animal.animalId}`}>
                                <SelectValue placeholder="Seleccionar documento" />
                              </SelectTrigger>
                              <SelectContent>
                                {UPP_MOVILIZACION_BOVINO_DOCUMENT_TYPES.map((item) => (
                                  <SelectItem key={item.key} value={item.key}>
                                    {item.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {selectedDocType?.requiresExpiry ? (
                            <div className="space-y-2">
                              <Label htmlFor={`expiry-${animal.animalId}`}>Fecha de vigencia</Label>
                              <Input
                                id={`expiry-${animal.animalId}`}
                                type="date"
                                value={state.expiryDate}
                                onChange={(event) =>
                                  updateAnimalUpload(animal.animalId, { expiryDate: event.target.value })
                                }
                              />
                            </div>
                          ) : null}

                          <div className="space-y-2">
                            <Label htmlFor={`file-${animal.animalId}`}>Archivo (PDF/JPG)</Label>
                            <Input
                              id={`file-${animal.animalId}`}
                              type="file"
                              accept=".pdf,.jpg,.jpeg"
                              onChange={(event) =>
                                updateAnimalUpload(animal.animalId, {
                                  file: event.target.files?.[0] ?? null,
                                })
                              }
                            />
                            {state.file ? (
                              <p className="text-xs text-muted-foreground">Archivo: {state.file.name}</p>
                            ) : null}
                          </div>

                          <Button
                            className="w-full"
                            disabled={
                              !state.file ||
                              !state.docType ||
                              Boolean(selectedDocType?.requiresExpiry && !state.expiryDate)
                            }
                            onClick={() => handleBovinoDocumentUpload(animal.animalId)}
                          >
                            Subir documento del bovino
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Historial de movilizaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {errorMessage ? <p className="mb-3 text-sm text-destructive">{errorMessage}</p> : null}
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay solicitudes de movilizacion.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Rancho</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>QR</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Ruta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.id.slice(0, 8)}</TableCell>
                    <TableCell>{uppName(row.upp_id)}</TableCell>
                    <TableCell>
                      <Badge variant={movementStatusVariant(row.status)}>
                        {STATUS_LABELS[row.status] ?? row.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.qr_code ? (
                          <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{row.qr_code.slice(0, 24)}...</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Pendiente</span>
                      )}
                    </TableCell>
                    <TableCell>{row.movement_date ?? "-"}</TableCell>
                    <TableCell className="max-w-[180px] truncate text-sm">{row.route_note ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
