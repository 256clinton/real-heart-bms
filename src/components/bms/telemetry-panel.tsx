import type { TelemetryFrame } from "@/hooks/use-telemetry-stream";
import { Sparkline, useFieldHistory } from "./sparkline";

export function TelemetryPanel({ frame }: { frame: TelemetryFrame }) {
  const avgT = frame.cells.reduce((a, c) => a + c.t, 0) / frame.cells.length;
  const current = useFieldHistory(frame.current);
  const power = useFieldHistory(frame.power);
  const temp = useFieldHistory(avgT);
  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Live Telemetry · 1000 Hz aggregated</div>
          <h3 className="mt-0.5 text-sm font-medium">Pack signal stream</h3>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-mono text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary pulse-dot" /> LIVE
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-md border border-border bg-secondary/30 p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Current</span>
            <span className="text-mono text-sm text-primary">{current[current.length - 1].toFixed(1)} A</span>
          </div>
          <div className="mt-1 h-16"><Sparkline data={current} color="oklch(0.78 0.21 145)" /></div>
        </div>
        <div className="rounded-md border border-border bg-secondary/30 p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Power</span>
            <span className="text-mono text-sm text-accent">{power[power.length - 1].toFixed(0)} W</span>
          </div>
          <div className="mt-1 h-16"><Sparkline data={power} color="oklch(0.72 0.18 200)" /></div>
        </div>
        <div className="rounded-md border border-border bg-secondary/30 p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Temperature</span>
            <span className="text-mono text-sm text-warn">{temp[temp.length - 1].toFixed(1)} °C</span>
          </div>
          <div className="mt-1 h-16"><Sparkline data={temp} color="oklch(0.8 0.18 75)" /></div>
        </div>
      </div>
    </div>
  );
}
