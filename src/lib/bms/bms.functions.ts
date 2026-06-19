import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------------- Packs ----------------
export const listPacks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("packs")
      .select("id, rider, lat, lng, status, soc, soh, last_seen")
      .order("id", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const lockdownPack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ packId: z.string().min(1), arm: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const newStatus = data.arm ? "locked" : "ok";
    const { error: e1 } = await context.supabase
      .from("packs")
      .update({ status: newStatus })
      .eq("id", data.packId);
    if (e1) throw new Error(e1.message);
    const { error: e2 } = await context.supabase.from("events").insert({
      pack_id: data.packId,
      kind: "lockdown",
      severity: data.arm ? "danger" : "info",
      message: data.arm
        ? `Pack ${data.packId} LOCKDOWN engaged by operator`
        : `Pack ${data.packId} lockdown released`,
      created_by: context.userId,
    });
    if (e2) throw new Error(e2.message);
    return { ok: true, status: newStatus };
  });

// ---------------- Events ----------------
export const listEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ limit: z.number().int().min(1).max(200).default(30) }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("events")
      .select("id, ts, pack_id, kind, severity, message")
      .order("ts", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const logEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        packId: z.string().optional(),
        kind: z.string().min(1),
        severity: z.enum(["info", "warn", "danger"]).default("info"),
        message: z.string().min(1).max(500),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("events").insert({
      pack_id: data.packId ?? null,
      kind: data.kind,
      severity: data.severity,
      message: data.message,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- Authorized chargers ----------------
export const listChargers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("authorized_chargers")
      .select("id, pubkey, label, enabled, created_at")
      .order("id", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setChargerEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().min(1), enabled: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("authorized_chargers")
      .update({ enabled: data.enabled })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await context.supabase.from("events").insert({
      kind: "charger_auth",
      severity: data.enabled ? "info" : "warn",
      message: `Charger ${data.id} ${data.enabled ? "enabled" : "disabled"} by operator`,
      created_by: context.userId,
    });
    return { ok: true };
  });
