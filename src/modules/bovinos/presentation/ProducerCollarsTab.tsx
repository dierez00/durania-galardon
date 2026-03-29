"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, Eye, Link2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiAssignCollar, apiFetchProducerCollars } from "@/modules/collars/infra/api/collaresApi";
import { apiFetchBovinos } from "@/modules/bovinos/infra/api/bovinosApi";
import { buildProjectHref } from "@/modules/workspace/presentation/workspace-routing";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/shared/ui/drawer";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { TableRowActions } from "@/shared/ui/table-row-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { CollarStatusBadge } from "@/modules/collars/presentation";
import {
  ProducerCollarsFilters,
  type ProducerCollarsFiltersState,
} from "./ProducerCollarsFilters";

type ProducerCollarApi = {
  id: string;
  collar_id: string;
  status: "inactive" | "active" | "linked" | "unlinked" | "suspended" | "retired";
  animal_id: string | null;
  firmware_version: string | null;
  linked_at: string | null;
  purchased_at: string | null;
};

type ProducerAnimalApi = {
  id: string;
  upp_id: string;
  siniiga_tag: string;
  name: string | null;
  sex: "M" | "F";
  breed: string | null;
  age_years: number | null;
  health_status: string | null;
  status: string;
  current_collar_id: string | null;
};

interface ProducerCollarsTabProps {
  selectedUppId?: string | null;
  onAssigned?: () => Promise<void> | void;
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ProducerCollarsTab({
  selectedUppId,
  onAssigned,
}: Readonly<ProducerCollarsTabProps>) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [collars, setCollars] = useState<ProducerCollarApi[]>([]);
  const [animals, setAnimals] = useState<ProducerAnimalApi[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [selectedCollar, setSelectedCollar] = useState<ProducerCollarApi | null>(null);
  const [selectedAnimalId, setSelectedAnimalId] = useState("");
  const [filters, setFilters] = useState<ProducerCollarsFiltersState>({
    search: "",
    status: "",
    firmware: "",
    linkedFrom: "",
    linkedTo: "",
  });
  const [drawerSearch, setDrawerSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [collarsData, animalsData] = await Promise.all([
        apiFetchProducerCollars(selectedUppId),
        apiFetchBovinos(selectedUppId),
      ]);

      setCollars((collarsData ?? []) as ProducerCollarApi[]);
      setAnimals((animalsData ?? []) as ProducerAnimalApi[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar collares.");
    } finally {
      setLoading(false);
    }
  }, [selectedUppId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const animalsById = useMemo(() => {
    return new Map(animals.map((animal) => [animal.id, animal]));
  }, [animals]);

  const eligibleAnimals = useMemo(() => {
    return animals.filter((animal) => !animal.current_collar_id);
  }, [animals]);

  const firmwareOptions = useMemo(() => {
    return Array.from(
      new Set(
        collars
          .map((collar) => collar.firmware_version)
          .filter((firmware): firmware is string => Boolean(firmware))
      )
    );
  }, [collars]);

  const filteredCollars = useMemo(() => {
    return collars.filter((collar) => {
      const matchesSearch = filters.search.trim()
        ? collar.collar_id.toLowerCase().includes(filters.search.trim().toLowerCase())
        : true;
      const matchesStatus = filters.status ? collar.status === filters.status : true;
      const matchesFirmware = filters.firmware
        ? (collar.firmware_version ?? "") === filters.firmware
        : true;

      const linkedDate = collar.linked_at ? new Date(collar.linked_at) : null;
      const fromBoundary = filters.linkedFrom ? new Date(`${filters.linkedFrom}T00:00:00`) : null;
      const toBoundary = filters.linkedTo ? new Date(`${filters.linkedTo}T23:59:59`) : null;

      const matchesLinkedDate = (() => {
        if (!fromBoundary && !toBoundary) {
          return true;
        }
        if (!linkedDate) {
          return false;
        }
        if (fromBoundary && linkedDate < fromBoundary) {
          return false;
        }
        if (toBoundary && linkedDate > toBoundary) {
          return false;
        }
        return true;
      })();

      return matchesSearch && matchesStatus && matchesFirmware && matchesLinkedDate;
    });
  }, [collars, filters]);

  const filteredEligibleAnimals = useMemo(() => {
    const normalizedQuery = drawerSearch.trim().toLowerCase();
    if (!normalizedQuery) {
      return eligibleAnimals;
    }

    return eligibleAnimals.filter((animal) => {
      const name = animal.name?.toLowerCase() ?? "";
      return (
        animal.siniiga_tag.toLowerCase().includes(normalizedQuery) ||
        name.includes(normalizedQuery)
      );
    });
  }, [eligibleAnimals, drawerSearch]);

  let drawerHint: string | null = null;
  if (eligibleAnimals.length === 0) {
    drawerHint = "No hay animales elegibles sin collar activo en esta UPP.";
  } else if (filteredEligibleAnimals.length === 0) {
    drawerHint = "No hay coincidencias para la busqueda actual.";
  }

  const closeDrawer = () => {
    setSelectedCollar(null);
    setSelectedAnimalId("");
    setDrawerSearch("");
    setAssigning(false);
  };

  const handleAssign = async () => {
    if (!selectedCollar || !selectedAnimalId) {
      return;
    }

    setAssigning(true);
    setError("");
    try {
      await apiAssignCollar(selectedCollar.id, selectedAnimalId);
      await Promise.all([loadData(), onAssigned?.()]);
      closeDrawer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible asignar el collar.");
      setAssigning(false);
    }
  };

  const handleViewMore = (animalId: string) => {
    if (!selectedUppId) return;
    router.push(`${buildProjectHref("producer", selectedUppId, "animales")}/${animalId}?tab=ubicacion`);
  };

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <ProducerCollarsFilters
        filters={filters}
        firmwareOptions={firmwareOptions}
        onChange={setFilters}
      />

      <Card>
        <CardHeader>
          <CardTitle>
            Collares del productor
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({filteredCollars.length} visibles)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Collar ID</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Firmware</TableHead>
                  <TableHead>Animal actual</TableHead>
                  <TableHead>Vinculado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCollars.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No hay collares disponibles para esta UPP.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCollars.map((collar) => {
                    const linkedAnimal = collar.animal_id ? animalsById.get(collar.animal_id) : null;
                    const canAssign = ["active", "unlinked"].includes(collar.status) && !collar.animal_id;
                    const canView = Boolean(collar.animal_id);

                    return (
                      <TableRow key={collar.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-sm font-semibold">
                          {collar.collar_id}
                        </TableCell>
                        <TableCell className="text-sm">
                          <CollarStatusBadge status={collar.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {collar.firmware_version ?? "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {linkedAnimal ? (
                            <div className="space-y-0.5">
                              <p className="font-medium">{linkedAnimal.name ?? "Sin nombre"}</p>
                              <p className="font-mono text-xs text-muted-foreground">
                                {linkedAnimal.siniiga_tag}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Sin asignar</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(collar.linked_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <TableRowActions
                            label="Acciones del collar"
                            items={[
                              {
                                key: "view-more",
                                label: "Ver mas",
                                icon: Eye,
                                disabled: !canView,
                                onSelect: () => {
                                  if (collar.animal_id) {
                                    handleViewMore(collar.animal_id);
                                  }
                                },
                              },
                              {
                                key: "assign-cow",
                                label: "Asignar vaca",
                                icon: Link2,
                                disabled: !canAssign || eligibleAnimals.length === 0,
                                onSelect: () => {
                                  setSelectedCollar(collar);
                                  setSelectedAnimalId("");
                                },
                              },
                            ]}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Drawer
        open={Boolean(selectedCollar)}
        onOpenChange={(open) => {
          if (!open) {
            closeDrawer();
          }
        }}
        direction="right"
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Asignar vaca al collar</DrawerTitle>
            <DrawerDescription>
              Selecciona un animal elegible del rancho para vincularlo al collar.
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-4 px-4 pb-4">
            <div className="space-y-1">
              <Label htmlFor="collar-id-readonly">Collar</Label>
              <Input id="collar-id-readonly" value={selectedCollar?.collar_id ?? ""} readOnly />
            </div>

            <div className="space-y-3">
              <Label htmlFor="animal-card-search">Seleccionar vaca (arete SINIIGA)</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="animal-card-search"
                  className="pl-8"
                  placeholder="Buscar por arete o nombre"
                  value={drawerSearch}
                  onChange={(event) => setDrawerSearch(event.target.value)}
                />
              </div>

              {drawerHint ? <p className="text-xs text-muted-foreground">{drawerHint}</p> : null}

              <div className="max-h-[42vh] space-y-2 overflow-y-auto pr-1">
                {filteredEligibleAnimals.map((animal) => {
                  const isSelected = selectedAnimalId === animal.id;
                  return (
                    <button
                      key={animal.id}
                      type="button"
                      onClick={() => setSelectedAnimalId(animal.id)}
                      className={`w-full rounded-md border p-3 text-left transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40 hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-mono text-sm font-semibold">{animal.siniiga_tag}</p>
                          <p className="text-sm text-muted-foreground">
                            {animal.name ?? "Sin nombre"}
                          </p>
                        </div>
                        {isSelected ? <BadgeCheck className="h-4 w-4 text-primary" /> : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{animal.sex === "M" ? "Macho" : "Hembra"}</span>
                        <span>{animal.breed ?? "Sin raza"}</span>
                        <span>{animal.age_years == null ? "Edad s/r" : `${animal.age_years} ano(s)`}</span>
                        <span>{animal.health_status ?? "Salud s/r"}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DrawerFooter>
            <Button
              type="button"
              disabled={!selectedAnimalId || assigning}
              onClick={handleAssign}
            >
              {assigning ? "Asignando..." : "Confirmar asignacion"}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer} disabled={assigning}>
              Cancelar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
