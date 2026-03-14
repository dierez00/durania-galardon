import { useState } from "react";
import { uploadProducerDocumentUseCase, uploadUppDocumentUseCase } from "../../infra/container";
import { toast } from "sonner";

export function useDocumentUpload() {
  const [uploading, setUploading] = useState(false);

  const uploadProducerDocument = async (
    file: File,
    documentTypeKey: string,
    expiryDate?: string
  ) => {
    setUploading(true);
    try {
      await uploadProducerDocumentUseCase.execute(file, documentTypeKey, expiryDate);
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
