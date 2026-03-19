import { useEffect, useState } from "react";
import { FileText, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { PRODUCER_PERSONAL_DOCUMENT_TYPES } from "../../domain/entities/ProducerDocumentEntity";
import { UPP_DOCUMENT_TYPES } from "../../domain/entities/UppDocumentEntity";
import { useDocumentUpload } from "../hooks/useDocumentUpload";

interface Props {
  upps: Array<{ id: string; name: string }>;
  onSuccess: () => void;
  mode?: "all" | "personal" | "upp";
  defaultUppId?: string | null;
}

export function DocumentUploadCard({
  upps,
  onSuccess,
  mode = "all",
  defaultUppId = null,
}: Props) {
  const { uploading, uploadProducerDocument, uploadUppDocument } = useDocumentUpload();
  const [personalDocType, setPersonalDocType] = useState("");
  const [uppDocType, setUppDocType] = useState("");
  const [selectedUppId, setSelectedUppId] = useState(defaultUppId ?? "");
  const [personalFile, setPersonalFile] = useState<File | null>(null);
  const [personalExpiryDate, setPersonalExpiryDate] = useState("");
  const [uppFile, setUppFile] = useState<File | null>(null);
  const [uppExpiryDate, setUppExpiryDate] = useState("");

  const personalOnly = mode === "personal";
  const uppOnly = mode === "upp";

  useEffect(() => {
    if (defaultUppId) {
      setSelectedUppId(defaultUppId);
    }
  }, [defaultUppId]);

  const handlePersonalUpload = async () => {
    if (!personalFile || !personalDocType) return;
    try {
      await uploadProducerDocument(personalFile, personalDocType, personalExpiryDate || undefined);
      setPersonalFile(null);
      setPersonalExpiryDate("");
      onSuccess();
    } catch {
      // Error handled by hook with toast
    }
  };

  const handleUppUpload = async () => {
    if (!uppFile || !uppDocType || !selectedUppId) return;
    try {
      await uploadUppDocument(uppFile, selectedUppId, uppDocType, uppExpiryDate || undefined);
      setUppFile(null);
      setUppExpiryDate("");
      onSuccess();
    } catch {
      // Error handled by hook with toast
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {uppOnly ? "Cargar Documento de Rancho" : personalOnly ? "Cargar Documento Personal" : "Cargar Documento"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={uppOnly ? "upp" : "personal"}>
          {mode === "all" ? (
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="personal">Documentos Personales</TabsTrigger>
              <TabsTrigger value="upp">Documentos de Rancho</TabsTrigger>
            </TabsList>
          ) : null}

          {!uppOnly ? (
            <TabsContent value="personal" className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Documento</Label>
                <Select value={personalDocType} onValueChange={setPersonalDocType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar documento" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCER_PERSONAL_DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type.key} value={type.key}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Archivo (PDF o JPG)</Label>
                <div
                  className="relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 transition hover:border-primary"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
                      setPersonalFile(event.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => {
                    const input = document.getElementById("personal-file-input") as HTMLInputElement;
                    input?.click();
                  }}
                >
                  <FileText className="mb-2 h-10 w-10 text-gray-400" />
                  <span className="mb-1 text-sm text-gray-500">Selecciona o arrastra un archivo aqui</span>
                  <span className="text-xs text-gray-400">(PDF o JPG)</span>
                  <Input
                    id="personal-file-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg"
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                    style={{ display: "none" }}
                    onChange={(event) => setPersonalFile(event.target.files?.[0] || null)}
                  />
                  {personalFile ? (
                    <span className="mt-2 flex items-center gap-2">
                      <span className="text-xs font-medium text-primary">{personalFile.name}</span>
                      <button
                        type="button"
                        aria-label="Quitar archivo"
                        className="rounded p-1 hover:bg-red-100"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPersonalFile(null);
                        }}
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </button>
                    </span>
                  ) : null}
                </div>
              </div>

              {personalDocType &&
              PRODUCER_PERSONAL_DOCUMENT_TYPES.find((type) => type.key === personalDocType)
                ?.requiresExpiry ? (
                <div className="space-y-2">
                  <Label>
                    {PRODUCER_PERSONAL_DOCUMENT_TYPES.find((type) => type.key === personalDocType)
                      ?.issueDateBased
                      ? "Fecha de Emision"
                      : "Fecha de Vigencia"}
                  </Label>
                  <Input
                    type="date"
                    value={personalExpiryDate}
                    onChange={(event) => setPersonalExpiryDate(event.target.value)}
                  />
                </div>
              ) : null}

              <Button
                onClick={handlePersonalUpload}
                disabled={!personalFile || !personalDocType || uploading}
                className="w-full"
              >
                {uploading ? "Subiendo..." : "Subir Documento Personal"}
              </Button>
            </TabsContent>
          ) : null}

          {!personalOnly ? (
            <TabsContent value="upp" className="space-y-4">
              {!defaultUppId ? (
                <div className="space-y-2">
                  <Label>Rancho (UPP)</Label>
                  <Select value={selectedUppId} onValueChange={setSelectedUppId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar rancho" />
                    </SelectTrigger>
                    <SelectContent>
                      {upps.map((upp) => (
                        <SelectItem key={upp.id} value={upp.id}>
                          {upp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label>Tipo de Documento</Label>
                <Select value={uppDocType} onValueChange={setUppDocType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar documento" />
                  </SelectTrigger>
                  <SelectContent>
                    {UPP_DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type.key} value={type.key}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Archivo (PDF o JPG)</Label>
                <div
                  className="relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 transition hover:border-primary"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
                      setUppFile(event.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => {
                    const input = document.getElementById("upp-file-input") as HTMLInputElement;
                    input?.click();
                  }}
                >
                  <FileText className="mb-2 h-10 w-10 text-gray-400" />
                  <span className="mb-1 text-sm text-gray-500">Selecciona o arrastra un archivo aqui</span>
                  <span className="text-xs text-gray-400">(PDF o JPG)</span>
                  <Input
                    id="upp-file-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg"
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                    style={{ display: "none" }}
                    onChange={(event) => setUppFile(event.target.files?.[0] || null)}
                  />
                  {uppFile ? (
                    <span className="mt-2 flex items-center gap-2">
                      <span className="text-xs font-medium text-primary">{uppFile.name}</span>
                      <button
                        type="button"
                        aria-label="Quitar archivo"
                        className="rounded p-1 hover:bg-red-100"
                        onClick={(event) => {
                          event.stopPropagation();
                          setUppFile(null);
                        }}
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </button>
                    </span>
                  ) : null}
                </div>
              </div>

              {uppDocType &&
              UPP_DOCUMENT_TYPES.find((type) => type.key === uppDocType)?.requiresExpiry ? (
                <div className="space-y-2">
                  <Label>Fecha de Vigencia</Label>
                  <Input
                    type="date"
                    value={uppExpiryDate}
                    onChange={(event) => setUppExpiryDate(event.target.value)}
                  />
                </div>
              ) : null}

              <Button
                onClick={handleUppUpload}
                disabled={!uppFile || !uppDocType || !selectedUppId || uploading}
                className="w-full"
              >
                {uploading ? "Subiendo..." : "Subir Documento de Rancho"}
              </Button>
            </TabsContent>
          ) : null}
        </Tabs>
      </CardContent>
    </Card>
  );
}
