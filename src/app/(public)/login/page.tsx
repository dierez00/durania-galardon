"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Card, CardContent } from "@/shared/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { ThemeLogo } from "@/shared/ui/branding/ThemeLogo";
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
  return (
    <Suspense fallback={<PublicLoginPageFallback />}>
      <PublicLoginPageContent />
    </Suspense>
  );
}

function PublicLoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash);
    const callbackError =
      searchParams.get("error_description") ??
      searchParams.get("auth_message") ??
      hashParams.get("error_description");

    if (callbackError) {
      setErrorMessage(callbackError);
    }
  }, [searchParams]);

  return (
    <div className="flex min-h-screen bg-background">
      <div className="relative hidden items-center justify-center overflow-hidden bg-linear-to-br from-primary to-primary-hover lg:flex lg:w-1/2">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 h-64 w-64 rounded-full border border-primary-foreground/20" />
          <div className="absolute right-16 bottom-32 h-96 w-96 rounded-full border border-primary-foreground/10" />
          <div className="absolute top-1/2 left-1/3 h-48 w-48 rounded-full border border-primary-foreground/15" />
        </div>
        <div className="relative z-10 max-w-lg px-12 text-center text-primary-foreground">
          <div className="mx-auto h-20 w-20">
            <ThemeLogo className="h-20 w-20" tone="on-dark" alt="Logo O.C.H.O.A" priority />
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight">O.C.H.O.A</h1>
          <p className="mb-2 text-lg text-primary-foreground/85">
            Operacion y Control de Hatos Offline Automatizados  
          </p>
          <div className="mx-auto my-6 h-0.5 w-16 bg-primary-foreground/30" />
          <p className="text-sm leading-relaxed text-primary-foreground/70">
            Control ganadero, trazabilidad sanitaria y gestion de exportacion bovina.
            Sistema oficial del estado.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="mx-auto mb-4 h-16 w-16">
              <ThemeLogo className="h-16 w-16" alt="Logo O.C.H.O.A" priority />
            </div>
            <h1 className="text-2xl font-bold text-foreground">O.C.H.O.A</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sistema de Identificacion Individual del Ganado
            </p>
          </div>

          <Card className="border-border/70 shadow-lg">
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
                    placeholder="usuario@email.com"
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

                <div className="text-right">
                  <Link className="text-sm text-primary hover:underline" href="/forgot-password">
                    Olvide mi contrasena
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
          <Card className="my-6 border-t" >
                <p className="text-center text-sm text-muted-foreground">
                  Para acceder al sistema y poder visualizar los datos puedes usar las siguientes credenciales:
                </p>
                <p className="text-center text-sm text-muted-foreground">
                  Admin: admin@gmail.com  / password
                </p>
                <p className="text-center text-sm text-muted-foreground">
                  Productor: productor@gmail.com  / password
                </p>
                <p className="text-center text-sm text-muted-foreground">
                  Mvz: mvz@gmail.com  / password
                </p>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            O.C.H.O.A v1.0 - Durania
          </p>
        </div>
      </div>
    </div>
  );
}

function PublicLoginPageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <p className="text-sm text-muted-foreground">Cargando...</p>
    </div>
  );
}
