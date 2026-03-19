"use client";

import { ProducerUppDetailContent, ProducerUppDetailSkeleton } from "./ProducerUppDetailContent";
import { useProducerUppContext } from "./hooks/useProducerUppContext";
import { useProducerUppDetail } from "./hooks/useProducerUppDetail";

export default function ProducerProjectDetailsPage() {
  const { selectedUppId } = useProducerUppContext();
  const { upp, loading, error } = useProducerUppDetail(selectedUppId ?? "");

  if (!selectedUppId || loading) {
    return <ProducerUppDetailSkeleton />;
  }

  if (error || !upp) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-destructive">{error || "Rancho no encontrado."}</p>
      </div>
    );
  }

  return <ProducerUppDetailContent upp={upp} />;
}
