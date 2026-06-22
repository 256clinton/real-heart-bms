import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to realtime changes on packs, events, and authorized_chargers.
 * On any change, invalidate the matching React Query cache so UI updates instantly.
 */
export function useBmsRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("bms-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "packs" },
        () => qc.invalidateQueries({ queryKey: ["packs"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => qc.invalidateQueries({ queryKey: ["events"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "authorized_chargers" },
        () => qc.invalidateQueries({ queryKey: ["chargers"] }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
