import { useEffect, useState, useMemo } from "react";
import { 
  Battery, 
  BatteryCharging, 
  KeyRound, 
  Lock, 
  Signal, 
  Wifi, 
  AlertTriangle, 
  Terminal, 
  Activity, 
  Cpu 
} from "lucide-react";
import type { StreamStatus, TelemetryFrame } from "@/hooks/use-telemetry-stream";
import { useChargeStatus } from "@/lib/bms/charge-status";

interface NetworkMetrics {
  label: string;
  color: string;
  iconColor: string;
}

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
  const [showTerminalHud, setShowTerminalHud] = useState(false);
  const charge = useChargeStatus();

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  // Compute Live Network Diagnostic Health Classes
  const networkHealth = useMemo((): NetworkMetrics => {
    const rssi = frame.rssi;
    const rtt = frame.rttMs;

    if (status === "offline") {
      return { label: "DISCONNECTED", color: "text-destructive", iconColor: "stroke-destructive" };
    }
    if (rtt > 150 || rssi < -85) {
      return { label: "DEGRADED LINK", color: "text-destructive font-bold animate-pulse", iconColor: "text-destructive" };
    }
    if (rtt > 60 || rssi < -75) {
      return { label: "UNSTABLE", color: "text-warn", iconColor: "text-warn" };
    }
    return { label: "OPTIMAL", color: "text-primary", iconColor: "text-primary" };
  }, [frame.rssi, frame.rttMs, status]);

  const statusMeta = useMemo(() => {
    if (paused) return { color: "text-warn", dot: "bg-warn pulse-dot", label: "PAUSED" };
    switch (status) {
      case "live": return { color: "text-primary", dot: "bg-primary pulse-dot", label: "STREAM LIVE" };
      case "reconnecting": return { color: "text-warn", dot: "bg-warn pulse-dot", label: "RECONNECTING · LOCAL SIM" };
      case "offline": return { color: "text-destructive", dot: "bg-destructive", label: "STREAM OFFLINE" };
      default: return { color: "text-accent", dot: "bg-accent pulse-dot", label: "CONNECTING" };
    }
  }, [status, paused]);

  const verifying = charge.reason === "Verifying charger";
  const chargeMeta = useMemo(() => {
    if (charge.allowed) {
      return { color: "text-primary border-primary/20 bg-primary/5", dot: "bg-primary pulse-dot", label: "CHARGE ALLOWED", icon: BatteryCharging };
    }
    if (verifying) {
      return { color: "text-accent border-accent/20 bg-accent/5", dot: "bg-accent pulse-dot", label: "VERIFYING CHARGER", icon: KeyRound };
    }
    if (charge.sourceId) {
      return { color: "text-destructive border-destructive/20 bg-destructive/5", dot: "bg-destructive pulse-dot", label: "CHARGE BLOCKED", icon: Lock };
    }
    return { color: "text-muted-foreground border-border bg-secondary/20", dot: "bg-muted-foreground/60", label: "CHARGE IDLE", icon: Battery };
  }, [charge.allowed, verifying, charge.sourceId]);

  const ChargeIcon = chargeMeta.icon;

  return (
    <div className="w-full relative select-none">
      {/* Primary Engineering Status Strip */}
      <div className="flex items-center justify-between border-b border-border bg-card/70 px-6 py-2 text-xs text-mono backdrop-blur transition-all duration-200">
        <div className="flex items-center gap-6">
          {/* Node Lifecycle Status Block */}
          <div className="flex items-center gap-2 border-r border-border/60 pr-4">
            <div className={`h-2 w-2 rounded-full ${statusMeta.dot}`} />
            <span className="text-foreground tracking-tight font-sans font-bold">SPIRO BMS</span>
            <span className={`text-[11px] font-semibold ${statusMeta.color}`}>{statusMeta.label}</span>
            <span className="text-muted-foreground/60 text-[10px]">v4.2.1-0x7A11C</span>
          </div>

          {/* Current Hardware Identifiers */}
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="bg-secondary/40 px-1.5 py-0.5 rounded border border-border/40 text-foreground font-semibold">
              PACK-{frame.packId}
            </span>
            <span className="text-[10px] tracking-widest text-primary/80 flex items-center gap-1">
              <Cpu className="h-3 w-3" /> ENCLAVE: SECURE
            </span>
          </div>

          {/* Dynamic Charge Interlock Status */}
          <div
            className={`flex items-center gap-2 rounded border px-2 py-0.5 text-[11px] font-medium transition-all ${chargeMeta.color}`}
            title={charge.detail || charge.reason}
          >
            <div className={`h-1.5 w-1.5 rounded-full ${chargeMeta.dot}`} />
            <ChargeIcon className="h-3 w-3" />
            <span>{chargeMeta.label}</span>
            {!charge.allowed && charge.sourceId && (
              <span className="text-muted-foreground font-normal normal-case border-l border-border/60 pl-1.5 ml-0.5">
                {charge.reason.toLowerCase()}: {charge.detail?.split(".")[0]}
              </span>
            )}
          </div>
        </div>

        {/* Telemetry Transport Network Indicators */}
        <div className="flex items-center gap-5 text-muted-foreground text-[11px]">
          <button 
            onClick={() => setShowTerminalHud(prev => !prev)}
            className={`flex items-center gap-1 border px-1.5 py-0.5 rounded transition-all cursor-pointer ${
              showTerminalHud ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-muted-foreground"
            }`}
          >
            <Terminal className="h-3 w-3" /> HUD
          </button>
          
          <span className="flex items-center gap-1.5">
            <Wifi className={`h-3 w-3 ${networkHealth.iconColor}`} />
            <span>MQTT/4G</span> 
            <span className="text-foreground font-medium">{frame.rttMs}ms</span>
          </span>
          
          <span className="flex items-center gap-1.5">
            <Signal className={`h-3 w-3 ${networkHealth.iconColor}`} />
            <span>RSSI</span>
            <span className="text-foreground font-medium">{frame.rssi}dBm</span>
          </span>

          <div className="flex items-center gap-1.5 pl-2 border-l border-border/60 text-muted-foreground/80">
            <span className={`text-[10px] px-1 rounded uppercase tracking-wide font-sans font-bold bg-secondary ${networkHealth.color}`}>
              {networkHealth.label}
            </span>
            <span>{now.toUTCString().slice(17, 25)} UTC</span>
          </div>
        </div>
      </div>

      {/* Expandable Advanced Terminal HUD Control Console */}
      {showTerminalHud && (
        <div className="absolute top-full left-0 w-full bg-background/95 border-b border-border/80 p-4 text-mono text-xs text-muted-foreground shadow-xl z-50 backdrop-blur-md animate-fade-in grid grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <div className="text-[10px] text-primary uppercase font-bold tracking-wider flex items-center gap-1">
              <Activity className="h-3 w-3" /> Enclave Telemetry Context
            </div>
            <div>Cell Matrix Configuration: <span className="text-foreground">14S4P (56 LFP Elements)</span></div>
            <div>Risk Core Predictor Residual: <span className="text-foreground">0.024 RMS</span></div>
          </div>
          <div className="space-y-1.5 border-l border-border/40 pl-6">
            <div className="text-[10px] text-warn uppercase font-bold tracking-wider flex items-center gap-1">
              <KeyRound className="h-3 w-3" /> Crypto Authentication Trace
            </div>
            <div className="truncate">Active Source ID: <span className="text-foreground font-mono">{charge.sourceId || "NONE (IDLE)"}</span></div>
            <div>Hardware Relays: <span className={charge.allowed ? "text-primary" : "text-destructive"}>{charge.allowed ? "CLOSED (ON)" : "ISOLATED (OFF)"}</span></div>
          </div>
          <div className="space-y-1.5 border-l border-border/40 pl-6">
            <div className="text-[10px] text-destructive uppercase font-bold tracking-wider flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Field Emergency Tools
            </div>
            <div className="text-[11px] leading-tight mb-1">Manual overrides immediately trigger safety isolation logs.</div>
            <button 
              onClick={() => alert("Simulating firmware hard reset vector...")}
              className="px-2 py-1 bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 text-destructive rounded text-[10px] font-sans font-semibold tracking-wide cursor-pointer transition-colors"
            >
              FORCED FIRMWARE REBOOT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}