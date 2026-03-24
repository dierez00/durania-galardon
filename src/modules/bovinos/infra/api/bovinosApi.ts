import { getAccessToken } from "@/shared/lib/auth-session";

const BASE = "/api/producer/bovinos";

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

async function getToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error("No existe sesión activa.");
  return token;
}

export async function apiFetchBovinos(uppId?: string | null): Promise<unknown[]> {
  const token = await getToken();
  const url = uppId ? `${BASE}?uppId=${encodeURIComponent(uppId)}` : BASE;
  const res = await fetch(url, { headers: authHeaders(token) });
  const body = await res.json();
  if (!res.ok || !body.ok) {
    throw new Error(body.error?.message ?? "No fue posible cargar bovinos.");
  }
  return body.data.bovinos ?? [];
}

export async function apiFetchBovinoById(id: string): Promise<unknown | null> {
  const token = await getToken();
  const res = await fetch(`${BASE}/${id}`, { headers: authHeaders(token) });
  if (res.status === 404) return null;
  const body = await res.json();
  if (!res.ok || !body.ok) {
    throw new Error(body.error?.message ?? "No fue posible cargar el bovino.");
  }
  return body.data.bovino ?? null;
}

export async function apiFetchFieldTests(animalId: string): Promise<unknown[]> {
  const token = await getToken();
  const res = await fetch(`${BASE}/${animalId}/field-tests`, {
    headers: authHeaders(token),
  });
  const body = await res.json();
  if (!res.ok || !body.ok) {
    throw new Error(body.error?.message ?? "No fue posible cargar pruebas.");
  }
  return body.data.fieldTests ?? [];
}

export async function apiFetchIncidents(animalId: string): Promise<unknown[]> {
  const token = await getToken();
  const res = await fetch(`${BASE}/${animalId}/incidents`, {
    headers: authHeaders(token),
  });
  const body = await res.json();
  if (!res.ok || !body.ok) {
    throw new Error(body.error?.message ?? "No fue posible cargar incidentes.");
  }
  return body.data.incidents ?? [];
}

export async function apiFetchVaccinations(
  animalId: string
): Promise<unknown[]> {
  const token = await getToken();
  const res = await fetch(`${BASE}/${animalId}/vaccinations`, {
    headers: authHeaders(token),
  });
  const body = await res.json();
  if (!res.ok || !body.ok) {
    throw new Error(body.error?.message ?? "No fue posible cargar vacunaciones.");
  }
  return body.data.vaccinations ?? [];
}

export async function apiFetchExports(animalId: string): Promise<unknown[]> {
  const token = await getToken();
  const res = await fetch(`${BASE}/${animalId}/exports`, {
    headers: authHeaders(token),
  });
  const body = await res.json();
  if (!res.ok || !body.ok) {
    throw new Error(body.error?.message ?? "No fue posible cargar exportaciones.");
  }
  return body.data.exports ?? [];
}

export async function apiFetchOffspring(animalId: string): Promise<unknown[]> {
  const token = await getToken();
  const res = await fetch(`${BASE}/${animalId}/offspring`, {
    headers: authHeaders(token),
  });
  const body = await res.json();
  if (!res.ok || !body.ok) {
    throw new Error(body.error?.message ?? "No fue posible cargar descendencia.");
  }
  return body.data.offspring ?? [];
}
