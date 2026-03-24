"use client";

import { useEffect, useState } from "react";
import type { MvzCollectionViewMode } from "./types";

export function useSessionViewMode(
  storageKey: string,
  initialMode: MvzCollectionViewMode = "table"
) {
  const [viewMode, setViewMode] = useState<MvzCollectionViewMode>(initialMode);

  useEffect(() => {
    const storedMode = sessionStorage.getItem(storageKey);
    if (storedMode === "table" || storedMode === "card") {
      setViewMode(storedMode);
    }
  }, [storageKey]);

  useEffect(() => {
    sessionStorage.setItem(storageKey, viewMode);
  }, [storageKey, viewMode]);

  return { viewMode, setViewMode };
}
