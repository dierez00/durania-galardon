"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMvzRanchContext } from "@/shared/hooks";

export default function MvzRanchosIndexPage() {
  const router = useRouter();
  const { hydrated, selectedUppId } = useMvzRanchContext();

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (selectedUppId) {
      router.replace(`/mvz/ranchos/${selectedUppId}`);
      return;
    }

    router.replace("/mvz/dashboard?selectRancho=1");
  }, [hydrated, router, selectedUppId]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
      Resolviendo panel de rancho...
    </div>
  );
}
