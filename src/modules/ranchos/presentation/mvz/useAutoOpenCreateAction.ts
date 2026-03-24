"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useAutoOpenCreateAction(onOpen: () => void) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("action") !== "nuevo") {
      return;
    }

    onOpen();

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("action");

    const nextUrl = nextParams.size > 0 ? `${pathname}?${nextParams.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [onOpen, pathname, router, searchParams]);
}
