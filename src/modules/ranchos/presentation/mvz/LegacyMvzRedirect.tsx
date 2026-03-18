"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMvzRanchContext } from "@/modules/ranchos/presentation/mvz";

export default function LegacyMvzRedirect({ targetTab }: { targetTab?: string }) {
  const router = useRouter();
  const { hydrated, selectedUppId } = useMvzRanchContext();

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (selectedUppId) {
      const suffix = targetTab ? `/${targetTab}` : "";
      router.replace(`/mvz/ranchos/${selectedUppId}${suffix}`);
      return;
    }

    router.replace("/mvz/dashboard?selectRancho=1");
  }, [hydrated, router, selectedUppId, targetTab]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
      Redirigiendo a la nueva jerarquia de ranchos...
    </div>
  );
}
