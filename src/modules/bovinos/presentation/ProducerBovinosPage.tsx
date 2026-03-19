"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { getAccessToken } from "@/shared/lib/auth-session";
import { useProducerUppContext } from "@/modules/producer/ranchos/presentation";
import { BovinosFilters } from "./BovinosFilters";
import { BovinoList } from "./BovinoList";
import { useBovinos } from "./hooks/useBovinos";

interface ProducerBovinosPageProps {
  title?: string;
  description?: string;
}

export default function ProducerBovinosPage({
  title = "Animales",
  description,
}: ProducerBovinosPageProps) {
  const { upps, selectedUppId, selectedUpp } = useProducerUppContext();
  const { bovinos, loading, error, filters, onFiltersChange, reload } =
    useBovinos(selectedUppId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [uppId, setUppId] = useState("");
  const [siniigaTag, setSiniigaTag] = useState("");
  const [sex, setSex] = useState<"M" | "F">("M");
  const [birthDate, setBirthDate] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selectedUppId) {
      setUppId(selectedUppId);
    }
  }, [selectedUppId]);

  const headingDescription = useMemo(() => {
    if (description) {
      return description;
    }

    if (selectedUpp) {
      return `Registro y control sanitario de ${selectedUpp.name}.`;
    }

    return "Registro y control sanitario de animales por UPP.";
  }, [description, selectedUpp]);

  const handleCreate = async () => {
    setFormError("");
    setSubmitting(true);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setFormError("No existe sesion activa.");
        return;
      }

      const response = await fetch("/api/producer/bovinos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          uppId,
          siniigaTag,
          sex,
          birthDate: birthDate || undefined,
        }),
      });

      const body = (await response.json()) as { ok: boolean; error?: { message: string } };
      if (!response.ok || !body.ok) {
        setFormError(body.error?.message ?? "No fue posible registrar el bovino.");
        return;
      }

      setSiniigaTag("");
      setBirthDate("");
      setDialogOpen(false);
      await reload();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{headingDescription}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Alta de bovino
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar bovino</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-1">
                <Label htmlFor="uppId">UPP</Label>
                {selectedUppId ? (
                  <Input id="uppId" value={selectedUpp?.name ?? uppId} readOnly />
                ) : (
                  <select
                    id="uppId"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    value={uppId}
                    onChange={(event) => setUppId(event.target.value)}
                  >
                    <option value="">Selecciona una UPP</option>
                    {upps.map((upp) => (
                      <option key={upp.id} value={upp.id}>
                        {upp.name} {upp.upp_code ? `(${upp.upp_code})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="tag">Arete SINIIGA</Label>
                <Input
                  id="tag"
                  value={siniigaTag}
                  onChange={(event) => setSiniigaTag(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sex">Sexo</Label>
                <select
                  id="sex"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={sex}
                  onChange={(event) => setSex(event.target.value as "M" | "F")}
                >
                  <option value="M">Macho</option>
                  <option value="F">Hembra</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="birthDate">Fecha de nacimiento</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(event) => setBirthDate(event.target.value)}
                />
              </div>
              {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
              <Button
                onClick={handleCreate}
                disabled={!uppId.trim() || !siniigaTag.trim() || submitting}
              >
                {submitting ? "Registrando..." : "Registrar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <BovinosFilters filters={filters} onFiltersChange={onFiltersChange} />

      <Card>
        <CardHeader>
          <CardTitle>Listado de bovinos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error ? <p className="px-6 pb-4 text-sm text-destructive">{error}</p> : null}
          {loading ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <BovinoList
              bovinos={bovinos}
              detailHrefBase={
                selectedUppId
                  ? `/producer/projects/${selectedUppId}/animales`
                  : "/producer/bovinos"
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
