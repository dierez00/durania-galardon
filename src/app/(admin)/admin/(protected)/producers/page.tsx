"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { AdminProductoresFilters } from "@/modules/admin/productores/presentation/AdminProductoresFilters";
import { AdminProductoresList } from "@/modules/admin/productores/presentation/AdminProductoresList";
import { useAdminProductores } from "@/modules/admin/productores/presentation/hooks/useAdminProductores";
import { useCreateAdminProductor } from "@/modules/admin/productores/presentation/hooks/useCreateAdminProductor";

export default function AdminProducersPage() {
  const {
    producers,
    total,
    totalPages,
    page,
    canPrev,
    canNext,
    setPage,
    loading,
    error,
    filters,
    sort,
    handleFiltersChange,
    handleSortChange,
    reload,
  } = useAdminProductores();

  const {
    email, setEmail,
    password, setPassword,
    fullName, setFullName,
    curp, setCurp,
    creating,
    createError,
    handleCreate,
  } = useCreateAdminProductor({ onSuccess: reload });

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold">Gestion de Productores</h1>
        <p className="text-sm text-muted-foreground">
          Alta, baja/suspension, estado documental e historial.
        </p>
      </div>

      {/* Forma de alta */}
      <Card>
        <CardHeader>
          <CardTitle>Alta de productor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contrasena</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="curp">CURP</Label>
              <Input
                id="curp"
                value={curp}
                onChange={(e) => setCurp(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleCreate}
                disabled={creating || !email.trim() || !password.trim() || !fullName.trim()}
              >
                {creating ? "Creando..." : "Crear productor"}
              </Button>
            </div>
          </div>
          {createError ? (
            <p className="text-sm text-destructive">{createError}</p>
          ) : null}
        </CardContent>
      </Card>

      {/* Filtros — FiltersLayout tiene su propio contenedor tipo card */}
      <AdminProductoresFilters filters={filters} onChange={handleFiltersChange} />

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle>
            Productores registrados
            {!loading && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({total} en total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Cargando...</p>
          ) : (
            <AdminProductoresList
              productores={producers}
              sort={sort}
              onSortChange={handleSortChange}
            />
          )}

          {/* Paginacion */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Pagina {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canPrev}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canNext}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
