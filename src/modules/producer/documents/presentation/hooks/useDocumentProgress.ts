import { useState, useEffect } from "react";
import type { DocumentProgress } from "../../domain/entities/DocumentProgressEntity";
import type { ProducerDocument } from "../../domain/entities/ProducerDocumentEntity";
import type { UppDocument } from "../../domain/entities/UppDocumentEntity";
import { calculateDocumentProgressUseCase } from "../../infra/container";

export function useDocumentProgress(
  producerDocs: ProducerDocument[],
  uppDocs: UppDocument[],
  upps: Array<{ id: string; name: string }>
) {
  const [progress, setProgress] = useState<DocumentProgress | null>(null);

  useEffect(() => {
    const prog = calculateDocumentProgressUseCase.execute(producerDocs, uppDocs, upps);
    setProgress(prog);
  }, [producerDocs, uppDocs, upps]);

  return progress;
}
