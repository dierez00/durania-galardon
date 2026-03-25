"use client";

import { startTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTenantWorkspace } from "@/modules/workspace";
import { getAccessToken } from "@/shared/lib/auth-session";
import { BovinoDetailContent } from "./BovinoDetailContent";
import { useMvzBovinoDetail } from "./hooks/useMvzBovinoDetail";

interface MvzBovinoDetailProps {
  uppId: string;
  animalId: string;
}

export function MvzBovinoDetail({ uppId, animalId }: Readonly<MvzBovinoDetailProps>) {
  const router = useRouter();
  const workspace = useTenantWorkspace();
  const { setDetailBreadcrumbLabel, setDetailBreadcrumbSelector } = workspace;
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
  } = useMvzBovinoDetail(uppId, animalId);

  useEffect(() => {
    setDetailBreadcrumbLabel(bovino?.siniiga_tag ?? "Detalle animal");
    return () => {
      setDetailBreadcrumbLabel(null);
    };
  }, [bovino?.siniiga_tag, setDetailBreadcrumbLabel]);

  useEffect(() => {
    let cancelled = false;

    const loadAnimalOptions = async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          return;
        }

        const response = await fetch(`/api/mvz/ranchos/${uppId}/animales`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const body = (await response.json()) as {
          ok?: boolean;
          data?: {
            animals?: Array<{
              animal_id: string;
              siniiga_tag: string;
              sex: "M" | "F";
              animal_status: string;
              sanitary_alert: string | null;
            }>;
          };
        };

        if (!response.ok || !body.ok || cancelled) {
          return;
        }

        setDetailBreadcrumbSelector({
          detailId: animalId,
          options: (body.data?.animals ?? []).map((animal) => ({
            id: animal.animal_id,
            label: animal.siniiga_tag,
            meta: [animal.sex === "M" ? "Macho" : "Hembra", animal.sanitary_alert ?? animal.animal_status]
              .filter(Boolean)
              .join(" · "),
          })),
          onDetailChange: (nextAnimalId) => {
            if (nextAnimalId === animalId) {
              return;
            }

            startTransition(() => {
              router.push(`/mvz/ranchos/${uppId}/animales/${nextAnimalId}`);
            });
          },
          searchPlaceholder: "Buscar vaca...",
          emptyMessage: "No se encontraron animales.",
        });
      } catch {
        // Si falla la carga del selector, conservamos el breadcrumb simple.
      }
    };

    void loadAnimalOptions();

    return () => {
      cancelled = true;
      setDetailBreadcrumbSelector(null);
    };
  }, [animalId, router, setDetailBreadcrumbSelector, uppId]);

  return (
    <BovinoDetailContent
      bovino={bovino}
      panel="mvz"
      loading={loading}
      error={error}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      fieldTests={fieldTests}
      incidents={incidents}
      vaccinations={vaccinations}
      exports={exports}
      offspring={offspring}
      backHref={`/mvz/ranchos/${uppId}/animales`}
      backLabel="Volver a animales"
    />
  );
}
