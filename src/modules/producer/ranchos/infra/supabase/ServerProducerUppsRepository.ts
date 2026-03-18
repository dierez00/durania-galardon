import type { ProducerUpp } from "@/modules/producer/ranchos/domain/entities/ProducerUppEntity";
import type {
  IProducerUppsRepository,
  ListProducerUppsParams,
  ListProducerUppsResult,
} from "@/modules/producer/ranchos/domain/repositories/producerUppsRepository";
import { createSupabaseRlsServerClient } from "@/server/auth/supabase";

export class ServerProducerUppsRepository implements IProducerUppsRepository {
  constructor(
    private readonly tenantId: string,
    private readonly accessToken: string,
    private readonly accessibleUppIds: string[]
  ) {}

  async list(params: ListProducerUppsParams): Promise<ListProducerUppsResult> {
    if (this.accessibleUppIds.length === 0) {
      return { upps: [] };
    }

    const supabase = createSupabaseRlsServerClient(this.accessToken);
    const uppsResult = await supabase
      .from("upps")
      .select(
        "id,producer_id,upp_code,name,address_text,location_lat,location_lng,hectares_total,herd_limit,status,created_at"
      )
      .eq("tenant_id", this.tenantId)
      .in("id", this.accessibleUppIds)
      .order("created_at", { ascending: false });

    if (uppsResult.error) {
      throw new Error(uppsResult.error.message);
    }

    const upps = (uppsResult.data ?? []) as ProducerUpp[];
    const filtered = upps.filter((upp) => {
      const matchSearch =
        !params.search ||
        upp.name.toLowerCase().includes(params.search.toLowerCase()) ||
        (upp.upp_code ?? "").toLowerCase().includes(params.search.toLowerCase());
      const matchStatus = !params.status || upp.status === params.status;
      return matchSearch && matchStatus;
    });

    return { upps: filtered };
  }

  async getById(id: string): Promise<ProducerUpp | null> {
    if (!this.accessibleUppIds.includes(id)) {
      return null;
    }

    const supabase = createSupabaseRlsServerClient(this.accessToken);
    const result = await supabase
      .from("upps")
      .select(
        "id,producer_id,upp_code,name,address_text,location_lat,location_lng,hectares_total,herd_limit,status,created_at"
      )
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .maybeSingle();

    if (result.error) {
      throw new Error(result.error.message);
    }

    return (result.data as ProducerUpp | null) ?? null;
  }
}
