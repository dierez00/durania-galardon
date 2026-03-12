import { getAccessToken } from "@/shared/lib/auth-session";
import type { ProducerUpp } from "../../domain/entities/ProducerUppEntity";
import type {
  IProducerUppsRepository,
  ListProducerUppsParams,
  ListProducerUppsResult,
} from "../../domain/repositories/producerUppsRepository";

const BASE_URL = "/api/producer/upp";

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
}

export async function fetchProducerUpps(): Promise<ProducerUpp[]> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("No existe sesión activa.");

  const response = await fetch(BASE_URL, { headers: authHeaders(accessToken) });
  const body = await response.json();

  if (!response.ok || !body.ok) {
    throw new Error(body.error?.message ?? "No fue posible cargar ranchos.");
  }

  return body.data.upps ?? [];
}

export async function fetchProducerUppById(id: string): Promise<ProducerUpp | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("No existe sesión activa.");

  const response = await fetch(`${BASE_URL}/${id}`, { headers: authHeaders(accessToken) });
  if (response.status === 404) return null;

  const body = await response.json();
  if (!response.ok || !body.ok) {
    throw new Error(body.error?.message ?? "No fue posible cargar el rancho.");
  }

  return body.data.upp ?? null;
}

export class ProducerUppsApiRepository implements IProducerUppsRepository {
  async list(params: ListProducerUppsParams): Promise<ListProducerUppsResult> {
    const upps = await fetchProducerUpps();

    const filtered = upps.filter((u) => {
      const matchSearch =
        !params.search ||
        u.name.toLowerCase().includes(params.search.toLowerCase()) ||
        (u.upp_code ?? "").toLowerCase().includes(params.search.toLowerCase());
      const matchStatus = !params.status || u.status === params.status;
      return matchSearch && matchStatus;
    });

    return { upps: filtered };
  }

  getById(id: string): Promise<ProducerUpp | null> {
    return fetchProducerUppById(id);
  }
}
