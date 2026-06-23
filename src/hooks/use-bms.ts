import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listPacks,
  listEvents,
  listChargers,
  lockdownPack,
  setChargerEnabled,
  logEvent,
} from "@/lib/bms/bms.functions";
import type { FleetAsset } from "@/components/bms/fleet";

// ==========================================
// 1. CONFIGURATION & GEOSPATIAL PROJECTION
// ==========================================
const KAMPALA_BOUNDS = {
  LAT_MIN: 0.25,
  LAT_MAX: 0.45,
  LNG_MIN: 32.48,
  LNG_MAX: 32.7,
} as const;

interface RawPack {
  id: string;
  rider: string | null;
  lat: number;
  lng: number;
  status: string;
  soc: number | string;
}

/**
 * Projects real-world GPS coordinates into localized 2D bounding space.
 * Includes sanitization boundaries to protect against invalid/NaN input data.
 */
function packToAsset(p: RawPack): FleetAsset {
  const lat = Number(p.lat) || KAMPALA_BOUNDS.LAT_MIN;
  const lng = Number(p.lng) || KAMPALA_BOUNDS.LNG_MIN;

  const xRaw = ((lng - KAMPALA_BOUNDS.LNG_MIN) / (KAMPALA_BOUNDS.LNG_MAX - KAMPALA_BOUNDS.LNG_MIN)) * 100;
  const yRaw = (1 - (lat - KAMPALA_BOUNDS.LAT_MIN) / (KAMPALA_BOUNDS.LAT_MAX - KAMPALA_BOUNDS.LAT_MIN)) * 100;

  // Enforce structural canvas padding constraints
  const x = Math.max(3, Math.min(97, isNaN(xRaw) ? 50 : xRaw));
  const y = Math.max(5, Math.min(95, isNaN(yRaw) ? 50 : yRaw));

  const riskMap: Record<string, FleetAsset["risk"]> = {
    danger: "danger",
    locked: "danger",
    warn: "warn",
    offline: "warn",
  };

  return {
    id: p.id,
    rider: p.rider?.trim() || "Unassigned Rider",
    x,
    y,
    vx: 0,
    vy: 0,
    size: 2.5,
    risk: riskMap[p.status] || "ok",
    soc: Math.max(0, Math.min(100, Number(p.soc) || 0)),
    speed: 0,
    lat,
    lng,
  };
}

// ==========================================
// 2. QUERY KEY FACTORY (Maintainability Pattern)
// ==========================================
export const bmsQueryKeys = {
  all: ["bms"] as const,
  packs: () => [...bmsQueryKeys.all, "packs"] as const,
  events: (limit?: number) => [...bmsQueryKeys.all, "events", { limit }] as const,
  chargers: () => [...bmsQueryKeys.all, "chargers"] as const,
};

// ==========================================
// 3. ADVANCED HOOK IMPLEMENTATIONS
// ==========================================

export function usePacks() {
  const fetchPacksFn = useServerFn(listPacks);
  
  const query = useQuery({
    queryKey: bmsQueryKeys.packs(),
    queryFn: () => fetchPacksFn(),
    refetchInterval: 15_000,
    staleTime: 10_000,
    placeholderData: (previousData) => previousData, // Smooth UI transitions during background refetches
  });

  const assets = useMemo<FleetAsset[]>(
    () => (query.data ?? []).map((p: RawPack) => packToAsset(p)),
    [query.data]
  );

  return { 
    assets, 
    isLoading: query.isLoading, 
    isRefetching: query.isRefetching,
    error: query.error 
  };
}

export function useDbEvents(limit = 30) {
  const fetchEventsFn = useServerFn(listEvents);
  
  return useQuery({
    queryKey: bmsQueryKeys.events(limit),
    queryFn: () => fetchEventsFn({ data: { limit } }),
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

export function useChargers() {
  const fetchChargersFn = useServerFn(listChargers);
  
  return useQuery({
    queryKey: bmsQueryKeys.chargers(),
    queryFn: () => fetchChargersFn(),
    refetchInterval: 30_000,
  });
}

/**
 * Advanced Mutation: Uses Optimistic Updates to instantly flip state toggles
 */
export function useToggleCharger() {
  const toggleChargerFn = useServerFn(setChargerEnabled);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; enabled: boolean }) => toggleChargerFn({ data: input }),
    
    // Step 1: Execute immediate local cache update before API hits server
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: bmsQueryKeys.chargers() });
      const previousChargers = queryClient.getQueryData(bmsQueryKeys.chargers());

      queryClient.setQueryData(bmsQueryKeys.chargers(), (old: any) => 
        old?.map((charger: any) => 
          charger.id === variables.id ? { ...charger, enabled: variables.enabled } : charger
        )
      );

      return { previousChargers };
    },
    // Step 2: Rollback to previous state if the network or database throws an error
    onError: (_err, _variables, context) => {
      if (context?.previousChargers) {
        queryClient.setQueryData(bmsQueryKeys.chargers(), context.previousChargers);
      }
    },
    // Step 3: Enforce definitive sync upon completion
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: bmsQueryKeys.chargers() });
      queryClient.invalidateQueries({ queryKey: bmsQueryKeys.events() });
    },
  });
}

/**
 * Advanced Mutation: Instantly updates fleet assets array when a pack is locked down
 */
export function useLockdownPack() {
  const lockdownPackFn = useServerFn(lockdownPack);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { packId: string; arm: boolean }) => lockdownPackFn({ data: input }),
    
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: bmsQueryKeys.packs() });
      const previousPacks = queryClient.getQueryData(bmsQueryKeys.packs());

      queryClient.setQueryData(bmsQueryKeys.packs(), (old: any) =>
        old?.map((pack: any) =>
          pack.id === variables.packId ? { ...pack, status: variables.arm ? "locked" : "ok" } : pack
        )
      );

      return { previousPacks };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousPacks) {
        queryClient.setQueryData(bmsQueryKeys.packs(), context.previousPacks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: bmsQueryKeys.packs() });
      queryClient.invalidateQueries({ queryKey: bmsQueryKeys.events() });
    },
  });
}

export function useLogEvent() {
  const logEventFn = useServerFn(logEvent);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      packId?: string;
      kind: string;
      severity?: "info" | "warn" | "danger";
      message: string;
    }) => logEventFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bmsQueryKeys.events() });
    },
  });
}