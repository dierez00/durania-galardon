import { useState } from "react";
import { uploadProducerDocumentUseCase, uploadUppDocumentUseCase } from "../../infra/container";
import { toast } from "sonner";

// Key para almacenar timestamps de uploads recientes en sessionStorage
const RECENT_UPLOAD_TIMESTAMP_KEY = "durania:document_upload_timestamp";

export function useDocumentUpload() {
  const [uploading, setUploading] = useState(false);

  /**
   * Registra el timestamp actual en sessionStorage para filtrar eventos duplicados
   * de "newly-uploaded" en el polling (evita mostrar alerta duplicada).
   */
  const recordUploadTime = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(RECENT_UPLOAD_TIMESTAMP_KEY, Date.now().toString());
    }
  };

  const uploadProducerDocument = async (
    file: File,
    documentTypeKey: string,
    expiryDate?: string
  ) => {
    setUploading(true);
    try {
      await uploadProducerDocumentUseCase.execute(file, documentTypeKey, expiryDate);
      recordUploadTime();
      toast.success("Documento subido exitosamente");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al subir documento";
      toast.error(message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const uploadUppDocument = async (
    file: File,
    uppId: string,
    documentType: string,
    expiryDate?: string
  ) => {
    setUploading(true);
    try {
      await uploadUppDocumentUseCase.execute(file, uppId, documentType, expiryDate);
      recordUploadTime();
      toast.success("Documento subido exitosamente");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al subir documento";
      toast.error(message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return { uploading, uploadProducerDocument, uploadUppDocument };
}
