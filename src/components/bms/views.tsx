import type { TelemetryFrame } from "@/hooks/use-telemetry-stream";
import { EventLog, type EventItem } from "./event-log";
import type { FleetAsset } from "./fleet";

export const TABS = ["Dashboard", "Live Fleet", "Anomalies", "Maintenance", "Repayments", "Routing", "Security", "Settings"] as const;
export type Tab = typeof TABS[number];

export function AnomaliesView({ frame, events }: { frame: TelemetryFrame; events: EventItem[] }) {
  const hot = frame.cells
    .map((c, i) => ({ i, ...c }))
    .filter((c) => c.t > 35 || c.v < 3.25)
    .sort((a, b) => b.t - a.t)
    .slice(0, 8);
  const warns = events.filter((e) => e.lvl === "warn" || e.lvl === "danger");
  return (
    <section className="grid grid-cols-12 gap-4">
      <div className="col-span-12 lg:col-span-7 panel p-5">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Cells under watch</div>
        <h3 className="mt-0.5 text-sm font-medium">Outliers vs pack mean</h3>
        <table className="text-mono mt-4 w-full text-xs">
          <thead className="text-muted-foreground">
            <tr className="text-left"><th className="pb-2">Cell</th><th>Voltage</th><th>Temp</th><th>SoC</th><th>Status</th></tr>
          </thead>
          <tbody>
            {hot.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No outliers · pack nominal</td></tr>}
            {hot.map((c) => (
              <tr key={c.i} className="border-t border-border/40">
                <td className="py-1.5">#{c.i + 1}</td>
                <td className={c.v < 3.25 ? "text-warn" : ""}>{c.v.toFixed(3)} V</td>
                <td className={c.t > 38 ? "text-destructive" : c.t > 35 ? "text-warn" : ""}>{c.t.toFixed(1)} °C</td>
                <td>{c.soc.toFixed(1)}%</td>
                <td className="text-warn">flagged</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="col-span-12 lg:col-span-5 space-y-4">
        <div className="panel p-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">ML Risk Score</div>
          <div className="text-mono mt-3 text-4xl text-primary">{frame.riskScore.toFixed(3)}</div>
          <div className="text-mono mt-1 text-[11px] text-muted-foreground">v3 ensemble · residual within bounds</div>
        </div>
        <EventLog events={warns.length ? warns : events.slice(0, 6)} />
      </div>
    </section>
  );
}

export function MaintenanceView({ assets }: { assets: FleetAsset[] }) {
  const queue = assets.slice(0, 10);
  return (
    <section className="panel p-5">
      <div className="mb-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Maintenance Queue</div>
        <h3 className="mt-0.5 text-sm font-medium">Scheduled service & inspections</h3>
      </div>
      <table className="text-mono w-full text-xs">
        <thead className="text-muted-foreground"><tr className="text-left"><th className="pb-2">Asset</th><th>Rider</th><th>SoC</th><th>Risk</th><th>Action</th></tr></thead>
        <tbody>
          {queue.map((a) => (
            <tr key={a.id} className="border-t border-border/40">
              <td className="py-2">{a.id}</td>
              <td>{a.rider}</td>
              <td>{a.soc.toFixed(0)}%</td>
              <td className={a.risk === "danger" ? "text-destructive" : a.risk === "warn" ? "text-warn" : "text-primary"}>{a.risk}</td>
              <td><button className="rounded border border-border px-2 py-0.5 hover:border-primary hover:text-primary">schedule</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function GenericView({ title, lines }: { title: string; lines: string[] }) {
  return (
    <section className="panel p-8">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Module</div>
      <h2 className="mt-1 text-xl font-medium">{title}</h2>
      <ul className="text-mono mt-6 space-y-3 text-xs text-muted-foreground">
        {lines.map((l) => (
          <li key={l} className="flex items-start gap-3 border-b border-border/40 pb-3">
            <span className="text-primary">›</span><span>{l}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
