"use client";

import { use } from "react";
import {
  ProducerUppDetailContent,
  ProducerUppDetailSkeleton,
  useProducerUppDetail,
} from "@/modules/producer/ranchos/presentation";

interface Props {
  params: Promise<{ uppId: string }>;
}

export default function ProducerRanchoDetailPage({ params }: Props) {
  const { uppId } = use(params);
  const { upp, loading, error } = useProducerUppDetail(uppId);

  if (loading) {
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
