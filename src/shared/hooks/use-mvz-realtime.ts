"use client";

import { useEffect } from "react";
import { getSupabaseBrowserClient } from "@/shared/lib/supabase-browser";

interface UseMvzRealtimeOptions {
  uppId?: string | null;
  onEvent: () => void;
}

export function useMvzRealtime({ uppId, onEvent }: UseMvzRealtimeOptions) {
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase.channel(`mvz-realtime-${uppId ?? "global"}`);

    const scopedTables = [
      "field_tests",
      "mvz_visits",
      "animal_vaccinations",
      "sanitary_incidents",
      "upp_documents",
      "export_requests",
      "movement_requests",
      "animals",
    ];

    scopedTables.forEach((table) => {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: uppId ? `upp_id=eq.${uppId}` : undefined,
        },
        onEvent
      );
    });

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "mvz_upp_assignments",
      },
      onEvent
    );

    void channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [onEvent, uppId]);
}
