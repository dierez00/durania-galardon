"use client";

import { useCallback, useEffect, useState } from "react";
import { Settings, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { getAccessToken } from "@/shared/lib/auth-session";

interface Regla60Setting {
  id: string;
  pct: number;
  daysLookback: number;
  effectiveFrom: string;
}

export function AdminRegla60Config() {
  const [setting, setSetting] = useState<Regla60Setting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [editPct, setEditPct] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);

  const loadSetting = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const resp = await fetch("/api/admin/normative", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new Error("Error al cargar configuración.");
      const json = (await resp.json()) as {
        ok: boolean;
        data?: { settings: Array<{ id: string; key: string; value_json: unknown; effective_from: string }> };
      };
      const row = json.data?.settings.find((s) => s.key === "export_60_rule_pct");
      if (row) {
        const val = row.value_json as { pct?: number; days_lookback?: number };
        setSetting({
          id: row.id,
          pct: val.pct ?? 60,
          daysLookback: val.days_lookback ?? 365,
          effectiveFrom: row.effective_from,
        });
        setEditPct(String(val.pct ?? 60));
      } else {
        setSetting(null);
        setEditPct("60");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSetting();
  }, [loadSetting]);

  const handleSave = async () => {
    const parsed = Number.parseInt(editPct, 10);
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 100) {
      setError("El porcentaje debe ser entre 1 y 100.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const token = await getAccessToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const resp = await fetch("/api/admin/normative", {
        method: "POST",
        headers,
        body: JSON.stringify({
          key: "export_60_rule_pct",
          valueJson: { pct: parsed, days_lookback: setting?.daysLookback ?? 365 },
          effectiveFrom: new Date().toISOString().slice(0, 10),
          status: "active",
        }),
      });
      if (!resp.ok) {
        const j = (await resp.json()) as { error?: { message?: string } };
        throw new Error(j.error?.message ?? "Error al guardar.");
      }
      setSuccess(true);
      setIsEditing(false);
      await loadSetting();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Configuración — Regla del 60%
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Cargando...
          </div>
        ) : (
          <>
            {success && (
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="w-4 h-4" />
                Guardado correctamente.
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 text-sm text-error">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Porcentaje mínimo requerido</p>
                {isEditing ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={editPct}
                      onChange={(e) => setEditPct(e.target.value)}
                      className="h-8 w-20"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {setting?.pct ?? 60}
                    <span className="text-base font-normal text-muted-foreground ml-1">%</span>
                  </p>
                )}
              </div>
              {setting && (
                <div>
                  <p className="text-xs text-muted-foreground">Vigente desde</p>
                  <p className="text-sm mt-1">
                    {new Date(setting.effectiveFrom).toLocaleDateString("es-MX")}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              {isEditing ? (
                <>
                  <Button size="sm" disabled={saving} onClick={() => void handleSave()}>
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Guardar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={saving}
                    onClick={() => {
                      setIsEditing(false);
                      setEditPct(String(setting?.pct ?? 60));
                      setError(null);
                    }}
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(true);
                    setSuccess(false);
                    setError(null);
                  }}
                >
                  Editar
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
