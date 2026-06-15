import { useEffect, useRef, useState } from "react";
import { Activity } from "lucide-react";
import type { TelemetryFrame } from "@/hooks/use-telemetry-stream";

export type EventItem = { id: number; t: string; lvl: "ok" | "warn" | "danger" | "info"; msg: string };

const SEED_EVENTS: EventItem[] = [
  { id: 1, t: "12:04:18", lvl: "ok", msg: "Swap auth completed · STN-KLA-019 · pack accepted" },
  { id: 2, t: "12:03:51", lvl: "info", msg: "OTA delta queued · 248KB · firmware 0x7A11D" },
  { id: 3, t: "12:03:22", lvl: "warn", msg: "Cell 23 ΔT +2.4°C above mean — flagged for ML review" },
  { id: 4, t: "12:02:09", lvl: "ok", msg: "Geofence verified · Kampala Central · CHARGE permitted" },
  { id: 5, t: "12:01:44", lvl: "danger", msg: "Pack UG-KLA-00921 LOCKDOWN — improper location" },
  { id: 6, t: "12:01:02", lvl: "info", msg: "MQTT keepalive · 0.6s · RTT 24ms" },
  { id: 7, t: "12:00:31", lvl: "ok", msg: "Secure boot enclave attested · SHA256 measured OK" },
];

export function useLiveEvents(frame: TelemetryFrame) {
  const [events, setEvents] = useState<EventItem[]>(SEED_EVENTS);
  const lastTs = useRef(0);
  useEffect(() => {
    if (frame.ts === lastTs.current) return;
    lastTs.current = frame.ts;
    const time = new Date(frame.ts).toUTCString().slice(17, 25);
    const maxT = Math.max(...frame.cells.map((c) => c.t));
    const minV = Math.min(...frame.cells.map((c) => c.v));
    const candidates: Omit<EventItem, "id" | "t">[] = [];
    if (maxT > 39) candidates.push({ lvl: "warn", msg: `Thermal rise · cell peak ${maxT.toFixed(1)}°C` });
    if (minV < 3.22) candidates.push({ lvl: "danger", msg: `Undervoltage on cell · ${minV.toFixed(3)}V` });
    if (Math.abs(frame.current) > 13.5) candidates.push({ lvl: "info", msg: `High draw ${frame.current.toFixed(1)}A · power ${frame.power.toFixed(0)}W` });
    if (frame.rttMs > 30) candidates.push({ lvl: "info", msg: `MQTT RTT ${frame.rttMs}ms · backhaul degraded` });
    if (candidates.length === 0 && Math.random() < 0.15) {
      candidates.push({ lvl: "ok", msg: `Heartbeat · pack ${frame.packId} · ${frame.rssi}dBm` });
    }
    if (candidates.length === 0) return;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    setEvents((prev) => [{ id: Date.now() + Math.random(), t: time, ...pick }, ...prev].slice(0, 30));
  }, [frame]);
  return events;
}

export function EventLog({ events }: { events: EventItem[] }) {
  return (
    <div className="panel p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Event Stream</div>
          <h3 className="mt-0.5 text-sm font-medium">Audit trail · live</h3>
        </div>
        <Activity className="h-4 w-4 text-muted-foreground" />
      </div>
      <ul className="text-mono space-y-1.5 text-xs max-h-72 overflow-y-auto pr-1">
        {events.map((e) => {
          const color =
            e.lvl === "ok" ? "text-primary"
            : e.lvl === "warn" ? "text-warn"
            : e.lvl === "danger" ? "text-destructive"
            : "text-accent";
          return (
            <li key={e.id} className="flex gap-3 border-b border-border/40 pb-1.5 last:border-0">
              <span className="text-muted-foreground">{e.t}</span>
              <span className={`uppercase ${color}`}>[{e.lvl}]</span>
              <span className="flex-1 text-foreground/85">{e.msg}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
