"use client";

import { use } from "react";
import { BovinoDetail } from "@/modules/bovinos/presentation";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProducerBovinoDetailPage({ params }: Props) {
  const { id } = use(params);
  return <BovinoDetail id={id} />;
}
