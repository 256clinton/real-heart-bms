import { useState } from "react";
import { Lock } from "lucide-react";

export function LockdownPanel() {
  const [armed, setArmed] = useState(false);
  return (
    <div className="panel relative overflow-hidden p-5">
      <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 via-transparent to-transparent" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Pack Override</div>
            <h3 className="mt-0.5 text-sm font-medium flex items-center gap-2">
              <Lock className="h-4 w-4 text-destructive" /> BMS Lockdown Control
            </h3>
          </div>
          <span className={`text-mono text-[10px] px-2 py-1 rounded border ${armed ? "border-destructive text-destructive" : "border-border text-muted-foreground"}`}>
            {armed ? "ARMED" : "STANDBY"}
          </span>
        </div>

        <div className="mt-4 space-y-2 text-mono text-xs">
          <div className="flex justify-between text-muted-foreground"><span>Credtrack repayment</span><span className="text-primary">ACTIVE</span></div>
          <div className="flex justify-between text-muted-foreground"><span>Lockdown risk score</span><span className="text-primary">LOW · 0.04</span></div>
          <div className="flex justify-between text-muted-foreground"><span>Geofence</span><span className="text-primary">IN-BOUNDS</span></div>
          <div className="flex justify-between text-muted-foreground"><span>Last command</span><span>OTA · 12:03:51</span></div>
        </div>

        <button
          onClick={() => setArmed((a) => !a)}
          className={`mt-5 w-full rounded-md border px-4 py-2.5 text-mono text-xs uppercase tracking-[0.18em] transition-all ${
            armed
              ? "border-destructive bg-destructive/15 text-destructive hover:bg-destructive/25"
              : "border-border bg-secondary/40 text-foreground hover:border-destructive hover:text-destructive"
          }`}
        >
          {armed ? "Disengage lockdown" : "Initiate remote lockdown"}
        </button>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Signed OTA command over MQTT/TLS · requires dual-operator confirm.
        </p>
      </div>
    </div>
  );
}
