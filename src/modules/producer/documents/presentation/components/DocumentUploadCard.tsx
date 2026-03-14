import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { FileText, X } from "lucide-react";
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
}

export function DocumentUploadCard({ upps, onSuccess }: Props) {
  const { uploading, uploadProducerDocument, uploadUppDocument } = useDocumentUpload();
  const [personalDocType, setPersonalDocType] = useState("");
  const [uppDocType, setUppDocType] = useState("");
  const [selectedUppId, setSelectedUppId] = useState("");
  const [personalFile, setPersonalFile] = useState<File | null>(null);
  const [personalExpiryDate, setPersonalExpiryDate] = useState("");
  const [uppFile, setUppFile] = useState<File | null>(null);
  const [uppExpiryDate, setUppExpiryDate] = useState("");

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
        <CardTitle>Cargar Documento</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="personal">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="personal">Documentos Personales</TabsTrigger>
            <TabsTrigger value="upp">Documentos de Rancho</TabsTrigger>
          </TabsList>

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
                className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 hover:border-primary transition cursor-pointer relative"
                style={{ minHeight: 140 }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    setPersonalFile(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => {
                  const input = document.getElementById("personal-file-input") as HTMLInputElement;
                  input?.click();
                }}
              >
                <FileText className="w-10 h-10 text-gray-400 mb-2" />
                <span className="text-gray-500 text-sm mb-1">Selecciona o arrastra un archivo aquí</span>
                <span className="text-xs text-gray-400">(PDF o JPG)</span>
                <Input
                  id="personal-file-input"
                  type="file"
                  accept=".pdf,.jpg,.jpeg"
                  className="absolute inset-0 opacity-0 cursor-pointer h-full w-full z-10"
                  style={{ display: "none" }}
                  onChange={(e) => setPersonalFile(e.target.files?.[0] || null)}
                />
                {personalFile && (
                  <span className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-primary font-medium">{personalFile.name}</span>
                    <button
                      type="button"
                      aria-label="Quitar archivo"
                      className="p-1 rounded hover:bg-red-100"
                      onClick={e => {
                        e.stopPropagation();
                        setPersonalFile(null);
                      }}
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                  </span>
                )}
              </div>
            </div>

            {personalDocType &&
              PRODUCER_PERSONAL_DOCUMENT_TYPES.find((t) => t.key === personalDocType)
                ?.requiresExpiry && (
                <div className="space-y-2">
                  <Label>
                    {PRODUCER_PERSONAL_DOCUMENT_TYPES.find((t) => t.key === personalDocType)
                      ?.issueDateBased
                      ? "Fecha de Emisión"
                      : "Fecha de Vigencia"}
                  </Label>
                  <Input
                    type="date"
                    value={personalExpiryDate}
                    onChange={(e) => setPersonalExpiryDate(e.target.value)}
                  />
                </div>
              )}

            <Button
              onClick={handlePersonalUpload}
              disabled={!personalFile || !personalDocType || uploading}
              className="w-full"
            >
              {uploading ? "Subiendo..." : "Subir Documento Personal"}
            </Button>
          </TabsContent>

          <TabsContent value="upp" className="space-y-4">
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
                className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 hover:border-primary transition cursor-pointer relative"
                style={{ minHeight: 140 }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    setUppFile(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => {
                  const input = document.getElementById("upp-file-input") as HTMLInputElement;
                  input?.click();
                }}
              >
                <FileText className="w-10 h-10 text-gray-400 mb-2" />
                <span className="text-gray-500 text-sm mb-1">Selecciona o arrastra un archivo aquí</span>
                <span className="text-xs text-gray-400">(PDF o JPG)</span>
                <Input
                  id="upp-file-input"
                  type="file"
                  accept=".pdf,.jpg,.jpeg"
                  className="absolute inset-0 opacity-0 cursor-pointer h-full w-full z-10"
                  style={{ display: "none" }}
                  onChange={(e) => setUppFile(e.target.files?.[0] || null)}
                />
                {uppFile && (
                  <span className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-primary font-medium">{uppFile.name}</span>
                    <button
                      type="button"
                      aria-label="Quitar archivo"
                      className="p-1 rounded hover:bg-red-100"
                      onClick={e => {
                        e.stopPropagation();
                        setUppFile(null);
                      }}
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                  </span>
                )}
              </div>
            </div>

            {uppDocType &&
              UPP_DOCUMENT_TYPES.find((t) => t.key === uppDocType)?.requiresExpiry && (
                <div className="space-y-2">
                  <Label>Fecha de Vigencia</Label>
                  <Input
                    type="date"
                    value={uppExpiryDate}
                    onChange={(e) => setUppExpiryDate(e.target.value)}
                  />
                </div>
              )}

            <Button
              onClick={handleUppUpload}
              disabled={!uppFile || !uppDocType || !selectedUppId || uploading}
              className="w-full"
            >
              {uploading ? "Subiendo..." : "Subir Documento de Rancho"}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
