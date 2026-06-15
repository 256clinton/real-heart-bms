import { useEffect, useMemo, useState } from "react";
import { Crosshair, Eye, EyeOff, MapPin, Pause, Play } from "lucide-react";
import type { StreamStatus } from "@/hooks/use-telemetry-stream";
import { clamp, rand } from "@/lib/bms/utils";

export type FleetAsset = {
  id: string;
  rider: string;
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  risk: "ok" | "warn" | "danger";
  soc: number;
  speed: number;
  lat: number;
  lng: number;
};

const RIDER_NAMES = ["Mukasa J.", "Nakato A.", "Okello B.", "Ssemakula P.", "Auma G.", "Kato M.", "Nansubuga L.", "Wasswa T."];

// Kampala center
const KLA_LAT = 0.3476;
const KLA_LNG = 32.5825;

const GOOGLE_MAPS_API_KEY = "AIzaSyB6dlRAi8zwzkcvwheumAfQjxmd7UmsN5I";

export function useFleet(count = 38, paused = false) {
  const [assets, setAssets] = useState<FleetAsset[]>(() =>
    Array.from({ length: count }, (_, i) => ({
      id: `UG-KLA-${String(284 + i).padStart(5, "0")}`,
      rider: RIDER_NAMES[i % RIDER_NAMES.length],
      x: rand(5, 95),
      y: rand(8, 92),
      vx: rand(-0.4, 0.4),
      vy: rand(-0.4, 0.4),
      size: rand(2, 4),
      risk: Math.random() < 0.05 ? "danger" : Math.random() < 0.12 ? "warn" : "ok",
      soc: rand(40, 95),
      speed: rand(0, 45),
      lat: KLA_LAT + rand(-0.06, 0.06),
      lng: KLA_LNG + rand(-0.06, 0.06),
    })),
  );
  useEffect(() => {
    const i = setInterval(() => {
      if (paused) return;
      setAssets((prev) =>
        prev.map((a) => {
          let nx = a.x + a.vx;
          let ny = a.y + a.vy;
          let vx = a.vx, vy = a.vy;
          if (nx < 3 || nx > 97) { vx = -vx; nx = clamp(nx, 3, 97); }
          if (ny < 5 || ny > 95) { vy = -vy; ny = clamp(ny, 5, 95); }
          let risk = a.risk;
          if (Math.random() < 0.01) {
            risk = Math.random() < 0.1 ? "danger" : Math.random() < 0.25 ? "warn" : "ok";
          }
          return {
            ...a, x: nx, y: ny, vx, vy, risk,
            soc: clamp(a.soc + rand(-0.3, 0.1), 5, 100),
            speed: clamp(a.speed + rand(-3, 3), 0, 60),
            lat: a.lat + rand(-0.0004, 0.0004),
            lng: a.lng + rand(-0.0004, 0.0004),
          };
        }),
      );
    }, 600);
    return () => clearInterval(i);
  }, [paused]);
  return assets;
}

export function FleetMap({
  assets, selectedId, onSelect, height = "h-72", showAnomalies = true,
}: { assets: FleetAsset[]; selectedId?: string | null; onSelect?: (id: string) => void; height?: string; showAnomalies?: boolean }) {
  const online = assets.filter((a) => a.risk !== "danger").length;
  const anomaly = assets.filter((a) => a.risk === "warn").length;
  const locked = assets.filter((a) => a.risk === "danger").length;

  const dangerPairs = useMemo(() => {
    if (!showAnomalies) return [];
    const danger = assets.filter((a) => a.risk === "danger");
    const pairs: [FleetAsset, FleetAsset][] = [];
    for (let i = 0; i < danger.length; i++) {
      for (let j = i + 1; j < danger.length; j++) {
        const dx = danger[i].x - danger[j].x;
        const dy = danger[i].y - danger[j].y;
        if (Math.sqrt(dx * dx + dy * dy) < 25) pairs.push([danger[i], danger[j]]);
      }
    }
    return pairs;
  }, [assets, showAnomalies]);

  return (
    <div className="panel relative overflow-hidden p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Live Fleet Map</div>
          <h3 className="mt-0.5 text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> Kampala · {assets.length} tracked assets
          </h3>
        </div>
        <div className="text-mono text-[10px] text-muted-foreground">UG-KLA · 0.3476°N 32.5825°E</div>
      </div>

      <div className={`relative ${height} overflow-hidden rounded-md border border-border bg-background/60 grid-bg`}>
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M 0 30 Q 30 20 50 40 T 100 50" stroke="oklch(0.4 0.03 240)" strokeWidth="0.4" fill="none" />
          <path d="M 0 70 Q 25 60 55 75 T 100 65" stroke="oklch(0.4 0.03 240)" strokeWidth="0.4" fill="none" />
          <path d="M 20 0 Q 35 30 25 60 T 40 100" stroke="oklch(0.4 0.03 240)" strokeWidth="0.4" fill="none" />
          <path d="M 75 0 Q 60 35 80 70 T 70 100" stroke="oklch(0.4 0.03 240)" strokeWidth="0.4" fill="none" />

          {showAnomalies && dangerPairs.map(([a, b], i) => (
            <line
              key={`ln-${i}`}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="oklch(0.65 0.24 25 / 0.35)"
              strokeWidth="0.3"
              strokeDasharray="1 1"
            />
          ))}
        </svg>
        <div className="absolute inset-x-0 h-32 sweep scan-line" />

        {showAnomalies && assets.filter((a) => a.risk !== "ok").map((p) => (
          <div
            key={`halo-${p.id}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.risk === "danger" ? 28 : 18}px`,
              height: `${p.risk === "danger" ? 28 : 18}px`,
              background: p.risk === "danger"
                ? "oklch(0.65 0.24 25 / 0.25)"
                : "oklch(0.8 0.18 75 / 0.2)",
              boxShadow: p.risk === "danger"
                ? "0 0 20px oklch(0.65 0.24 25 / 0.5), 0 0 0 1px oklch(0.65 0.24 25 / 0.4)"
                : "0 0 12px oklch(0.8 0.18 75 / 0.35)",
              animation: "pulse-dot 2s ease-in-out infinite",
            }}
          />
        ))}

        {assets.map((p) => {
          const isSel = selectedId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelect?.(p.id)}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full cursor-pointer hover:scale-150 z-10"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${p.size + (isSel ? 5 : 2)}px`,
                height: `${p.size + (isSel ? 5 : 2)}px`,
                background:
                  p.risk === "danger" ? "oklch(0.65 0.24 25)"
                  : p.risk === "warn" ? "oklch(0.8 0.18 75)"
                  : "oklch(0.78 0.21 145)",
                boxShadow: isSel
                  ? "0 0 16px oklch(0.72 0.18 200 / 0.9), 0 0 0 2px oklch(0.72 0.18 200)"
                  : p.risk === "danger"
                  ? "0 0 12px oklch(0.65 0.24 25 / 0.8)"
                  : "0 0 8px oklch(0.78 0.21 145 / 0.6)",
                transition: "left 600ms linear, top 600ms linear, width 200ms, height 200ms, box-shadow 200ms",
              }}
              title={`${p.id} · ${p.rider}`}
            />
          );
        })}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="relative">
            <div className="h-3 w-3 rounded-full bg-accent" />
            <div className="absolute inset-0 -m-2 rounded-full border border-accent/40 pulse-dot" />
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-mono text-[10px]">
        <div className="rounded border border-border bg-secondary/30 px-2 py-1.5">
          <div className="text-muted-foreground">Online</div>
          <div className="text-primary">{online.toLocaleString()}</div>
        </div>
        <div className="rounded border border-border bg-secondary/30 px-2 py-1.5">
          <div className="text-muted-foreground">Anomaly</div>
          <div className="text-warn">{anomaly}</div>
        </div>
        <div className="rounded border border-border bg-secondary/30 px-2 py-1.5">
          <div className="text-muted-foreground">Locked</div>
          <div className="text-destructive">{locked}</div>
        </div>
      </div>
    </div>
  );
}

export function FleetDetail({ asset }: { asset: FleetAsset | null }) {
  if (!asset) {
    return (
      <div className="panel p-5 text-mono text-xs text-muted-foreground">
        Search or click any asset to inspect live telemetry and location.
      </div>
    );
  }
  const color =
    asset.risk === "danger" ? "text-destructive"
    : asset.risk === "warn" ? "text-warn"
    : "text-primary";
  const mapSrc = `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${asset.lat},${asset.lng}&zoom=15`;
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Selected Asset</div>
          <h3 className="mt-0.5 text-sm font-medium">{asset.id}</h3>
        </div>
        <span className={`text-mono text-[10px] uppercase ${color}`}>{asset.risk}</span>
      </div>
      <dl className="text-mono mt-4 space-y-2 text-xs">
        <div className="flex justify-between"><dt className="text-muted-foreground">Rider</dt><dd>{asset.rider}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">SoC</dt><dd className={color}>{asset.soc.toFixed(1)}%</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">Speed</dt><dd>{asset.speed.toFixed(0)} km/h</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">GPS</dt><dd>{asset.lat.toFixed(5)}, {asset.lng.toFixed(5)}</dd></div>
      </dl>
      <div className="mt-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2 flex items-center gap-1">
          <MapPin className="h-3 w-3" /> Live Location
        </div>
        <div className="overflow-hidden rounded-md border border-border">
          <iframe
            key={asset.id}
            title={`Map for ${asset.id}`}
            src={mapSrc}
            width="100%"
            height="220"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${asset.lat},${asset.lng}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-mono text-[11px] text-primary hover:underline"
        >
          Open in Google Maps →
        </a>
      </div>
    </div>
  );
}

export function FleetControls({
  paused, onTogglePause, showAnomalies, onToggleAnomalies, status,
}: {
  paused: boolean;
  onTogglePause: () => void;
  showAnomalies: boolean;
  onToggleAnomalies: () => void;
  status: StreamStatus;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={onTogglePause}
        className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-mono text-[10px] uppercase tracking-[0.15em] transition-all cursor-pointer ${
          paused
            ? "border-warn bg-warn/10 text-warn hover:bg-warn/20"
            : "border-border bg-secondary/40 text-foreground hover:border-primary hover:text-primary"
        }`}
        title={paused ? "Resume live stream" : "Pause live stream"}
      >
        {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
        {paused ? "Resume" : "Pause"}
      </button>

      <button
        onClick={onToggleAnomalies}
        className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-mono text-[10px] uppercase tracking-[0.15em] transition-all cursor-pointer ${
          showAnomalies
            ? "border-warn bg-warn/10 text-warn hover:bg-warn/20"
            : "border-border bg-secondary/40 text-foreground hover:border-primary hover:text-primary"
        }`}
        title={showAnomalies ? "Hide anomaly overlays" : "Show anomaly overlays"}
      >
        {showAnomalies ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        Anomalies
      </button>

      <span className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-mono text-[10px] ${
        status === "live" ? "border-primary text-primary" :
        status === "reconnecting" ? "border-warn text-warn" :
        status === "offline" ? "border-destructive text-destructive" :
        "border-accent text-accent"
      }`}>
        <Crosshair className="h-3 w-3" />
        {status === "live" ? "LIVE" : status}
      </span>
    </div>
  );
}
