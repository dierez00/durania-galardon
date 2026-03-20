"use client";

import { useParams } from "next/navigation";
import { MvzBovinoDetail } from "@/modules/bovinos/presentation";

export default function MvzRanchAnimalDetailPage() {
  const params = useParams<{ uppId: string; animalId: string }>();

  return <MvzBovinoDetail uppId={params.uppId} animalId={params.animalId} />;
}
