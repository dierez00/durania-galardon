"use client";

import { use } from "react";
import { BovinoDetail } from "@/modules/bovinos/presentation";

interface ProducerProjectBovinoDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ProducerProjectBovinoDetailPage({
  params,
}: ProducerProjectBovinoDetailPageProps) {
  const { id } = use(params);
  return <BovinoDetail id={id} />;
}
