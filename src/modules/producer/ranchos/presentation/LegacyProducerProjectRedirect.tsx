"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProducerUppContext } from "./hooks/useProducerUppContext";

interface LegacyProducerProjectRedirectProps {
  targetModule?: "overview" | "animales" | "documentos" | "movilizacion" | "exportaciones" | "details";
}

export function LegacyProducerProjectRedirect({
  targetModule = "overview",
}: LegacyProducerProjectRedirectProps) {
  const router = useRouter();
  const { hydrated, selectedUppId } = useProducerUppContext();

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (selectedUppId) {
      const suffix = targetModule === "overview" ? "" : `/${targetModule}`;
      router.replace(`/producer/projects/${selectedUppId}${suffix}`);
      return;
    }

    router.replace("/producer");
  }, [hydrated, router, selectedUppId, targetModule]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
      Redirigiendo al proyecto activo...
    </div>
  );
}
