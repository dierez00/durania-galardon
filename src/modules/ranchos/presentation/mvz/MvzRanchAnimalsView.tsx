"use client";

import { useEffect, useMemo, useState } from "react";
import type { Bovino } from "@/modules/bovinos/domain/entities/Bovino";
import { BovinoList } from "@/modules/bovinos/presentation";
import { toDomainBovino } from "@/modules/bovinos/infra/mappers/bovino.mapper";
import { fetchMvzRanchAnimals } from "./mvzRanchApi";
import { ErrorState, LoadingState, MetricCard, SectionHeading } from "./shared";
import type { MvzRanchTabProps } from "./types";

export function MvzRanchAnimalsView({
  uppId,
  overview,
  refreshKey,
}: Readonly<MvzRanchTabProps>) {
  const [bovinos, setBovinos] = useState<Bovino[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchMvzRanchAnimals(uppId);
        if (cancelled) {
          return;
        }
        setBovinos(
          data.animals.map((animal) =>
            toDomainBovino({
              id: animal.animal_id,
              upp_id: animal.upp_id,
              upp_name: animal.upp_name,
              upp_code: animal.upp_code,
              upp_status: overview.upp_status,
              siniiga_tag: animal.siniiga_tag,
              sex: animal.sex,
              birth_date: animal.birth_date,
              status: animal.animal_status,
              mother_animal_id: animal.mother_animal_id,
              sanitary: {
                tb_date: animal.tb_date,
                tb_result: animal.tb_result,
                tb_valid_until: animal.tb_valid_until,
                tb_status: animal.tb_status,
                br_date: animal.br_date,
                br_result: animal.br_result,
                br_valid_until: animal.br_valid_until,
                br_status: animal.br_status,
                alert: animal.sanitary_alert,
              },
            })
          )
        );
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "No fue posible cargar animales.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [overview.upp_status, refreshKey, uppId]);

  const exportables = useMemo(
    () => bovinos.filter((animal) => animal.canExport).length,
    [bovinos]
  );

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Animales"
        description="Listado sanitario del hato con navegación directa a la ficha completa por animal."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total en vista" value={bovinos.length} />
        <MetricCard label="Activos" value={overview.active_animals} />
        <MetricCard label="Exportables" value={exportables} />
        <MetricCard label="En tratamiento" value={overview.animals_in_treatment} />
      </div>

      {error ? <ErrorState message={error} /> : null}
      {loading ? (
        <LoadingState label="Cargando animales..." />
      ) : (
        <BovinoList bovinos={bovinos} detailHrefBase={`/mvz/ranchos/${uppId}/animales`} />
      )}
    </div>
  );
}
