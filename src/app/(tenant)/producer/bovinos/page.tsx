"use client";

import { useState } from "react";
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
import { Plus } from "lucide-react";
import { getAccessToken } from "@/shared/lib/auth-session";
import {
  BovinosFilters,
  BovinoList,
  useBovinos,
} from "@/modules/bovinos/presentation";

export default function ProducerBovinosPage() {
  const { bovinos, loading, error, filters, onFiltersChange, reload } =
    useBovinos();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [uppId, setUppId] = useState("");
  const [siniigaTag, setSiniigaTag] = useState("");
  const [sex, setSex] = useState<"M" | "F">("M");
  const [birthDate, setBirthDate] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    setFormError("");
    setSubmitting(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setFormError("No existe sesión activa.");
        return;
      }
      const res = await fetch("/api/producer/bovinos", {
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
      const body = await res.json() as { ok: boolean; error?: { message: string } };
      if (!res.ok || !body.ok) {
        setFormError(body.error?.message ?? "No fue posible registrar el bovino.");
        return;
      }
      setUppId("");
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
          <h1 className="text-2xl font-bold">Bovinos</h1>
          <p className="text-sm text-muted-foreground">
            Registro y control sanitario de animales por UPP.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Alta de bovino
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar bovino</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-1">
                <Label htmlFor="uppId">UPP ID</Label>
                <Input
                  id="uppId"
                  value={uppId}
                  onChange={(e) => setUppId(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tag">Arete SINIIGA</Label>
                <Input
                  id="tag"
                  value={siniigaTag}
                  onChange={(e) => setSiniigaTag(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sex">Sexo</Label>
                <select
                  id="sex"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={sex}
                  onChange={(e) => setSex(e.target.value as "M" | "F")}
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
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>
              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}
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
          {error ? (
            <p className="px-6 pb-4 text-sm text-destructive">{error}</p>
          ) : null}
          {loading ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              Cargando...
            </p>
          ) : (
            <BovinoList bovinos={bovinos} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}


