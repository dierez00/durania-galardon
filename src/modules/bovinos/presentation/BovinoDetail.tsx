"use client";

import { startTransition, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTenantWorkspace } from "@/modules/workspace";
import { getAccessToken } from "@/shared/lib/auth-session";
import { BovinoDetailContent } from "./BovinoDetailContent";
import { useBovinoDetail } from "./hooks/useBovinoDetail";

interface Props {
  readonly id: string;
}

export function BovinoDetail({ id }: Props) {
  const pathname = usePathname();
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
  } = useBovinoDetail(id);

  useEffect(() => {
    setDetailBreadcrumbLabel(bovino?.siniiga_tag ?? "Detalle animal");
    return () => {
      setDetailBreadcrumbLabel(null);
    };
  }, [bovino?.siniiga_tag, setDetailBreadcrumbLabel]);

  useEffect(() => {
    if (!bovino?.upp_id || !pathname.startsWith("/producer/bovinos/")) {
      return;
    }

    startTransition(() => {
      router.replace(`/producer/projects/${bovino.upp_id}/animales/${id}`);
    });
  }, [bovino?.upp_id, id, pathname, router]);

  useEffect(() => {
    const uppId = bovino?.upp_id;
    if (!uppId) {
      return;
    }

    let cancelled = false;

    const loadAnimalOptions = async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          return;
        }

        const response = await fetch(`/api/producer/bovinos?uppId=${uppId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        const body = (await response.json()) as {
          ok?: boolean;
          data?: {
            bovinos?: Array<{
              id: string;
              siniiga_tag: string;
              sex: "M" | "F";
              status: string;
              sanitary?: {
                alert?: string | null;
              };
            }>;
          };
        };

        if (!response.ok || !body.ok || cancelled) {
          return;
        }

        setDetailBreadcrumbSelector({
          detailId: id,
          options: (body.data?.bovinos ?? []).map((animal) => ({
            id: animal.id,
            label: animal.siniiga_tag,
            meta: [animal.sex === "M" ? "Macho" : "Hembra", animal.sanitary?.alert ?? animal.status]
              .filter(Boolean)
              .join(" · "),
          })),
          onDetailChange: (nextAnimalId) => {
            if (nextAnimalId === id) {
              return;
            }

            startTransition(() => {
              router.push(`/producer/projects/${uppId}/animales/${nextAnimalId}`);
            });
          },
          searchPlaceholder: "Buscar animal...",
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
  }, [bovino?.upp_id, id, router, setDetailBreadcrumbSelector]);

  const backHref = bovino?.upp_id ? `/producer/projects/${bovino.upp_id}/animales` : "/producer/bovinos";
  const backLabel = bovino?.upp_id ? "Volver a animales" : "Volver a bovinos";

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
      backHref={backHref}
      backLabel={backLabel}
    />
  );
}
