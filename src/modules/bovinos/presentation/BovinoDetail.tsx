"use client";

import { BovinoDetailContent } from "./BovinoDetailContent";
import { useBovinoDetail } from "./hooks/useBovinoDetail";

interface Props {
  readonly id: string;
}

export function BovinoDetail({ id }: Props) {
  const {
    bovino,
    loading,
    error,
    activeTab,
    setActiveTab,
    fieldTests,
    incidents,
    vaccinations,
    exports,
    offspring,
  } = useBovinoDetail(id);

  return (
    <BovinoDetailContent
      bovino={bovino}
      loading={loading}
      error={error}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      fieldTests={fieldTests}
      incidents={incidents}
      vaccinations={vaccinations}
      exports={exports}
      offspring={offspring}
      backHref="/producer/bovinos"
      backLabel="Volver a bovinos"
    />
  );
}
