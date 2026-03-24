export interface ProducerUpp {
  id: string;
  producer_id: string;
  upp_code: string | null;
  name: string;
  address_text: string | null;
  location_lat: number | null;
  location_lng: number | null;
  hectares_total: number | null;
  herd_limit: number | null;
  status: string;
  created_at: string;
}

export interface ProducerUppsFiltersState {
  search: string;
  status: string;
}
