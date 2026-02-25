"use client";

import { getSupabaseBrowserClient } from "@/shared/lib/supabase-browser";

export async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
