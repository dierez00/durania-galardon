"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { getSupabaseBrowserClient } from "@/shared/lib/supabase-browser";
import { resolveClientRole } from "@/shared/lib/auth-client";
import { redirectPathForRole } from "@/shared/lib/auth";

interface LoginApiResponse {
  ok: boolean;
  data?: {
    redirectTo: string;
    session: {
      accessToken: string;
      refreshToken: string;
    };
  };
  error?: {
    message: string;
  };
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        router.replace(redirectPathForRole(roleResult.role));
      }
    };

    void run();
  }, [router]);

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-10 text-neutral-100">
      <div className="mx-auto w-full max-w-md">
        <Card className="border-neutral-700 bg-neutral-900 text-neutral-100">
          <CardHeader>
            <CardTitle>Acceso administrativo</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
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
                      origin: "admin",
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
                  setErrorMessage("Error de red al iniciar sesion.");
                } finally {
                  setLoading(false);
                }
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@siiniga.gob.mx"
                  className="border-neutral-700 bg-neutral-950"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contrasena</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="********"
                  className="border-neutral-700 bg-neutral-950"
                />
              </div>

              {errorMessage ? (
                <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {errorMessage}
                </p>
              ) : null}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Ingresando..." : "Ingresar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-neutral-400">
          <Link href="/login" className="underline underline-offset-4">
            Ir a login publico
          </Link>
        </p>
      </div>
    </div>
  );
}
