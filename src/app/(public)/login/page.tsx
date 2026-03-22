"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Card, CardContent } from "@/shared/ui/card";
import { Eye, EyeOff, Shield } from "lucide-react";
import { getSupabaseBrowserClient } from "@/shared/lib/supabase-browser";
import { resolveClientRole } from "@/shared/lib/auth-client";
import {
  resolvePanelHomePath,
  type PermissionKey,
  type TenantPanelType,
} from "@/shared/lib/auth";

interface LoginApiResponse {
  ok: boolean;
  data?: {
    roleKey: string;
    panelType: TenantPanelType;
    permissions: PermissionKey[];
    isMvzInternal: boolean;
    redirectTo: string;
    tenantId: string;
    tenantSlug: string;
    session: {
      accessToken: string;
      refreshToken: string;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

export default function PublicLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const run = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        return;
      }

      const roleResult = await resolveClientRole(supabase, data.session.user.id);
      if (roleResult.role) {
        const nextPanelType =
          roleResult.panelType ??
          (roleResult.role === "tenant_admin"
            ? "government"
            : roleResult.role === "mvz_government" || roleResult.role === "mvz_internal"
              ? "mvz"
              : "producer");

        router.replace(
          resolvePanelHomePath({
            panelType: nextPanelType,
            permissions: roleResult.permissions ?? [],
            isMvzInternal: roleResult.isMvzInternal,
          })
        );
      }
    };

    void run();
  }, [router]);

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1a5632] to-[#0d3320] relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 border border-white/20 rounded-full" />
          <div className="absolute bottom-32 right-16 w-96 h-96 border border-white/10 rounded-full" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 border border-white/15 rounded-full" />
        </div>
        <div className="relative z-10 text-center text-white px-12 max-w-lg">
          <div className="w-24 h-24 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-8 border border-white/20">
            <Shield className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4 tracking-tight">SIINIGA</h1>
          <p className="text-lg text-white/80 mb-2">
            Sistema de Identificacion Individual del Ganado
          </p>
          <div className="w-16 h-0.5 bg-white/30 mx-auto my-6" />
          <p className="text-sm text-white/60 leading-relaxed">
            Control ganadero, trazabilidad sanitaria y gestion de exportacion bovina.
            Sistema oficial del estado.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">SIINIGA</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sistema de Identificacion Individual del Ganado
            </p>
          </div>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-8 pb-8 px-8">
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground">Iniciar Sesion</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Ingrese sus credenciales para acceder al sistema
                </p>
              </div>

              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  setLoading(true);
                  setErrorMessage("");

                  try {
                    const response = await fetch("/api/auth/login", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        email,
                        password,
                        origin: "public",
                      }),
                    });

                    const body = (await response.json()) as LoginApiResponse;
                    if (!response.ok || !body.ok || !body.data) {
                      setErrorMessage(body.error?.message ?? "No fue posible iniciar sesion.");
                      return;
                    }

                    const supabase = getSupabaseBrowserClient();
                    const setSessionResult = await supabase.auth.setSession({
                      access_token: body.data.session.accessToken,
                      refresh_token: body.data.session.refreshToken,
                    });

                    if (setSessionResult.error) {
                      setErrorMessage("No fue posible persistir la sesion.");
                      return;
                    }

                    router.push(body.data.redirectTo);
                  } catch {
                    setErrorMessage("Ocurrio un error de red al iniciar sesion.");
                  } finally {
                    setLoading(false);
                  }
                }}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electronico</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@siiniga.gob.mx"
                    className="h-11"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contrasena</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Ingrese su contrasena"
                      className="h-11 pr-10"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {errorMessage ? (
                  <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
                    {errorMessage}
                  </p>
                ) : null}

                <Button type="submit" className="w-full h-11 text-base font-medium" disabled={loading}>
                  {loading ? "Validando..." : "Iniciar Sesion"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            SIINIGA Estatal v2.0 - Gobierno del Estado
          </p>
        </div>
      </div>
    </div>
  );
}
