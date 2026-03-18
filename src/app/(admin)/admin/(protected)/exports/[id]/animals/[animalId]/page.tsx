"use client";

import { use, useCallback, useEffect, useState } from "react";
import { getExportacionAnimalUseCase } from "@/modules/exportaciones/admin/infra/container";
import { AdminExportacionBovinoDetailContent } from "@/modules/exportaciones/admin/presentation/AdminExportacionBovinoDetailContent";
import type { AdminExportacionAnimalDetail } from "@/modules/exportaciones/admin/domain/entities/AdminExportacionAnimalEntity";

export default function AdminExportacionAnimalDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string; animalId: string }>;
}>) {
  const { id, animalId } = use(params);

  const [animal, setAnimal] = useState<AdminExportacionAnimalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnimal = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getExportacionAnimalUseCase.execute(id, animalId);
      if (data) {
        setAnimal(data);
      } else {
        setError("No se encontrÃ³ el animal.");
      }
    } catch {
      setError("Error al cargar los datos del animal.");
    } finally {
      setLoading(false);
    }
  }, [id, animalId]);

  useEffect(() => {
    void loadAnimal();
  }, [loadAnimal]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Cargando animal...
      </div>
    );
  }

  if (error || !animal) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <p className="text-sm text-destructive">{error || "Animal no encontrado."}</p>
      </div>
    );
  }

  return <AdminExportacionBovinoDetailContent exportId={id} animal={animal} />;
}

