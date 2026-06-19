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

// Project lat/lng into 0..100 canvas coords used by FleetMap.
// Kampala-ish bounding box; deterministic so dots don't jump on refetch.
const LAT_MIN = 0.25;
const LAT_MAX = 0.45;
const LNG_MIN = 32.48;
const LNG_MAX = 32.7;

function packToAsset(p: {
  id: string;
  rider: string | null;
  lat: number;
  lng: number;
  status: string;
  soc: number | string;
}): FleetAsset {
  const xRaw = ((p.lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * 100;
  const yRaw = (1 - (p.lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * 100;
  const x = Math.max(3, Math.min(97, xRaw));
  const y = Math.max(5, Math.min(95, yRaw));
  const risk: FleetAsset["risk"] =
    p.status === "danger" || p.status === "locked"
      ? "danger"
      : p.status === "warn" || p.status === "offline"
        ? "warn"
        : "ok";
  return {
    id: p.id,
    rider: p.rider ?? "—",
    x,
    y,
    vx: 0,
    vy: 0,
    size: 2.5,
    risk,
    soc: Number(p.soc),
    speed: 0,
    lat: p.lat,
    lng: p.lng,
  };
}

export function usePacks() {
  const fn = useServerFn(listPacks);
  const q = useQuery({
    queryKey: ["packs"],
    queryFn: () => fn(),
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
  const assets = useMemo<FleetAsset[]>(
    () => (q.data ?? []).map(packToAsset),
    [q.data],
  );
  return { assets, isLoading: q.isLoading, error: q.error };
}

export function useDbEvents() {
  const fn = useServerFn(listEvents);
  return useQuery({
    queryKey: ["events"],
    queryFn: () => fn({ data: { limit: 30 } }),
    refetchInterval: 10_000,
  });
}

export function useChargers() {
  const fn = useServerFn(listChargers);
  return useQuery({
    queryKey: ["chargers"],
    queryFn: () => fn(),
    refetchInterval: 30_000,
  });
}

export function useToggleCharger() {
  const fn = useServerFn(setChargerEnabled);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; enabled: boolean }) =>
      fn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chargers"] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useLockdownPack() {
  const fn = useServerFn(lockdownPack);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { packId: string; arm: boolean }) =>
      fn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["packs"] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useLogEvent() {
  const fn = useServerFn(logEvent);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      packId?: string;
      kind: string;
      severity?: "info" | "warn" | "danger";
      message: string;
    }) => fn({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}
