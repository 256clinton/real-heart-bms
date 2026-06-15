import { useEffect, useState } from "react";
import { Battery, BatteryCharging, KeyRound, Lock, Signal, Wifi } from "lucide-react";
import type { StreamStatus, TelemetryFrame } from "@/hooks/use-telemetry-stream";
import { useChargeStatus } from "@/lib/bms/charge-status";

export function StatusBar({
  status,
  frame,
  paused,
}: {
  status: StreamStatus;
  frame: TelemetryFrame;
  paused?: boolean;
}) {
  const [now, setNow] = useState(() => new Date());
  const charge = useChargeStatus();
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);
  const statusMeta = paused
    ? { color: "text-warn", dot: "bg-warn pulse-dot", label: "PAUSED" }
    : status === "live"
    ? { color: "text-primary", dot: "bg-primary pulse-dot", label: "STREAM LIVE" }
    : status === "reconnecting"
    ? { color: "text-warn", dot: "bg-warn pulse-dot", label: "RECONNECTING · LOCAL SIM" }
    : status === "offline"
    ? { color: "text-destructive", dot: "bg-destructive", label: "STREAM OFFLINE" }
    : { color: "text-accent", dot: "bg-accent pulse-dot", label: "CONNECTING" };

  const verifying = charge.reason === "Verifying charger";
  const chargeMeta = charge.allowed
    ? { color: "text-primary", dot: "bg-primary pulse-dot", label: "CHARGE ALLOWED", icon: BatteryCharging }
    : verifying
    ? { color: "text-accent", dot: "bg-accent pulse-dot", label: "VERIFYING CHARGER", icon: KeyRound }
    : charge.sourceId
    ? { color: "text-destructive", dot: "bg-destructive pulse-dot", label: "CHARGE BLOCKED", icon: Lock }
    : { color: "text-muted-foreground", dot: "bg-muted-foreground", label: "CHARGE IDLE", icon: Battery };
  const ChargeIcon = chargeMeta.icon;

  return (
    <div className="flex items-center justify-between border-b border-border bg-card/60 px-6 py-2.5 text-xs text-mono backdrop-blur">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${statusMeta.dot}`} />
          <span className="text-foreground">SPIRO BMS</span>
          <span className={statusMeta.color}>{statusMeta.label}</span>
          <span className="text-muted-foreground">v4.2.1 / firmware 0x7A11C</span>
        </div>
        <span className="text-muted-foreground">PACK-{frame.packId}</span>
        <span className="text-muted-foreground">ENCLAVE: SECURE</span>
        <div
          className={`flex items-center gap-2 rounded border border-border px-2 py-1 ${chargeMeta.color}`}
          title={charge.detail || charge.reason}
        >
          <div className={`h-1.5 w-1.5 rounded-full ${chargeMeta.dot}`} />
          <ChargeIcon className="h-3 w-3" />
          <span>{chargeMeta.label}</span>
          {!charge.allowed && charge.sourceId && (
            <span className="text-muted-foreground normal-case">
              · {charge.reason.toLowerCase()}: {charge.detail?.split(".")[0]}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-5 text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Wifi className="h-3 w-3 text-primary" />MQTT/4G · {frame.rttMs}ms
        </span>
        <span className="flex items-center gap-1.5">
          <Signal className="h-3 w-3 text-primary" />RSSI {frame.rssi}dBm
        </span>
        <span>{now.toUTCString().slice(17, 25)} UTC</span>
      </div>
    </div>
  );
}
