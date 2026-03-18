import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { ProducerDocument } from "../../domain/entities/ProducerDocumentEntity";
import type { UppDocument } from "../../domain/entities/UppDocumentEntity";
import {
  deleteProducerDocumentUseCase,
  deleteUppDocumentUseCase,
} from "../../infra/container";

export type DocumentDeleteLevel = "Personal" | "Rancho";
export type DeletableDoc = ProducerDocument | UppDocument;

export function useDocumentDelete() {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteDocument = useCallback(
    async (
      doc: DeletableDoc,
      level: DocumentDeleteLevel,
      hasOtherVersion: boolean
    ): Promise<void> => {
      setDeletingId(doc.id);

      try {
        if (level === "Personal") {
          await deleteProducerDocumentUseCase.execute(doc as ProducerDocument, hasOtherVersion);
        } else {
          await deleteUppDocumentUseCase.execute(doc as UppDocument, hasOtherVersion);
        }
        toast.success("Documento eliminado exitosamente");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al eliminar documento";
        toast.error(message);
        throw err;
      } finally {
        setDeletingId(null);
      }
    },
    []
  );

  return {
    deletingId,
    deleteDocument,
  };
}
