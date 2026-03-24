"use client";

import { getAccessToken } from "@/shared/lib/auth-session";
import type {
  MvzRanchAnimalRecord,
  MvzRanchClinicalRecord,
  MvzRanchDocumentRecord,
  MvzRanchIncidentRecord,
  MvzRanchReportRow,
  MvzRanchVaccinationRecord,
  MvzRanchVisitRecord,
  RanchOverview,
} from "./types";

interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: {
    message?: string;
  };
}

async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("No existe sesión activa.");
  }

  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
  const body = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !body.ok || !body.data) {
    throw new Error(body.error?.message ?? "No fue posible completar la operación.");
  }

  return body.data;
}

export function fetchMvzRanchOverview(uppId: string) {
  return authFetch<{ overview: RanchOverview }>(`/api/mvz/ranchos/${uppId}/overview`);
}

export function fetchMvzRanchAnimals(uppId: string) {
  return authFetch<{ animals: MvzRanchAnimalRecord[] }>(`/api/mvz/ranchos/${uppId}/animales`);
}

export function fetchMvzRanchClinical(uppId: string) {
  return authFetch<{ tests: MvzRanchClinicalRecord[] }>(
    `/api/mvz/ranchos/${uppId}/historial-clinico`
  );
}

export function fetchMvzRanchVaccinations(uppId: string) {
  return authFetch<{ vaccinations: MvzRanchVaccinationRecord[] }>(
    `/api/mvz/ranchos/${uppId}/vacunacion`
  );
}

export function createMvzRanchVaccination(uppId: string, payload: Record<string, unknown>) {
  return authFetch<{ vaccination: MvzRanchVaccinationRecord }>(`/api/mvz/ranchos/${uppId}/vacunacion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateMvzRanchVaccination(uppId: string, payload: Record<string, unknown>) {
  return authFetch<{ vaccination: MvzRanchVaccinationRecord }>(`/api/mvz/ranchos/${uppId}/vacunacion`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteMvzRanchVaccination(uppId: string, vaccinationId: string) {
  return authFetch<{ deletedId: string }>(
    `/api/mvz/ranchos/${uppId}/vacunacion?id=${encodeURIComponent(vaccinationId)}`,
    {
      method: "DELETE",
    }
  );
}

export function fetchMvzRanchIncidents(uppId: string) {
  return authFetch<{ incidents: MvzRanchIncidentRecord[] }>(`/api/mvz/ranchos/${uppId}/incidencias`);
}

export function createMvzRanchIncident(uppId: string, payload: Record<string, unknown>) {
  return authFetch<{ incident: MvzRanchIncidentRecord }>(`/api/mvz/ranchos/${uppId}/incidencias`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateMvzRanchIncident(uppId: string, payload: Record<string, unknown>) {
  return authFetch<{ incident: MvzRanchIncidentRecord }>(`/api/mvz/ranchos/${uppId}/incidencias`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteMvzRanchIncident(uppId: string, incidentId: string) {
  return authFetch<{ deletedId: string }>(
    `/api/mvz/ranchos/${uppId}/incidencias?id=${encodeURIComponent(incidentId)}`,
    {
      method: "DELETE",
    }
  );
}

export function fetchMvzRanchReports(uppId: string) {
  return authFetch<{ reports: MvzRanchReportRow[] }>(`/api/mvz/ranchos/${uppId}/reportes`);
}

export function fetchMvzRanchDocuments(uppId: string) {
  return authFetch<{ documents: MvzRanchDocumentRecord[] }>(
    `/api/mvz/ranchos/${uppId}/documentacion`
  );
}

export function createMvzRanchDocument(uppId: string, payload: Record<string, unknown>) {
  return authFetch<{ document: MvzRanchDocumentRecord }>(`/api/mvz/ranchos/${uppId}/documentacion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateMvzRanchDocument(
  uppId: string,
  documentId: string,
  payload: Record<string, unknown>
) {
  return authFetch<{ document: MvzRanchDocumentRecord }>(
    `/api/mvz/ranchos/${uppId}/documentacion/${documentId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
}

export function deleteMvzRanchDocument(uppId: string, documentId: string) {
  return authFetch<{ deletedId: string }>(
    `/api/mvz/ranchos/${uppId}/documentacion/${documentId}`,
    {
      method: "DELETE",
    }
  );
}

export function fetchMvzRanchVisits(uppId: string) {
  return authFetch<{ visits: MvzRanchVisitRecord[] }>(`/api/mvz/ranchos/${uppId}/visitas`);
}

export function createMvzRanchVisit(uppId: string, payload: Record<string, unknown>) {
  return authFetch<{ visit: MvzRanchVisitRecord }>(`/api/mvz/ranchos/${uppId}/visitas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateMvzRanchVisit(uppId: string, payload: Record<string, unknown>) {
  return authFetch<{ visit: MvzRanchVisitRecord }>(`/api/mvz/ranchos/${uppId}/visitas`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteMvzRanchVisit(uppId: string, visitId: string) {
  return authFetch<{ deletedId: string }>(
    `/api/mvz/ranchos/${uppId}/visitas?id=${encodeURIComponent(visitId)}`,
    {
      method: "DELETE",
    }
  );
}
