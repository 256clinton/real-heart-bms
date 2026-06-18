import { useState, useMemo } from "react";
import type { TelemetryFrame } from "@/hooks/use-telemetry-stream";
import { EventLog, type EventItem } from "./event-log";
import type { FleetAsset } from "./fleet";
import { 
  AlertOctagon, 
  CheckCircle, 
  CalendarClock, 
  EyeOff, 
  TrendingUp, 
  Gauge, 
  Thermometer, 
  Hammer,
  SlidersHorizontal,
  X,
  Download,
  Filter
} from "lucide-react";

export const TABS = [
  "Dashboard", 
  "Live Fleet", 
  "Anomalies", 
  "Maintenance", 
  "Repayments", 
  "Routing", 
  "Security", 
  "Settings"
] as const;

export type Tab = typeof TABS[number];

interface OutlierCell {
  i: number;
  v: number;
  t: number;
  soc: number;
  vDelta: number;
  tDelta: number;
  vZScore: number;
  tZScore: number;
  severity: "critical" | "warning";
}

type RiskFilter = "all" | "danger" | "warn";

export function AnomaliesView({ frame, events }: { frame: TelemetryFrame; events: EventItem[] }) {
  const [ignoredCellIndices, setIgnoredCellIndices] = useState<number[]>([]);
  const [zThresh, setZThresh] = useState<number>(2.5); // Statistical standard deviation filter cut-off

  // Compute live statistical outliers relative to real-time pack-wide moving means
  const cellAnalysis = useMemo(() => {
    const totalCells = frame.cells.length;
    if (totalCells === 0) return { outliers: [], meanV: 0, meanT: 0, stdevV: 0, stdevT: 0 };

    // 1. Calculate Core Pack Means
    const sumV = frame.cells.reduce((acc, c) => acc + c.v, 0);
    const sumT = frame.cells.reduce((acc, c) => acc + c.t, 0);
    const meanV = sumV / totalCells;
    const meanT = sumT / totalCells;

    // 2. Calculate Standard Deviations (Structural Variance Dispersion)
    const varianceV = frame.cells.reduce((acc, c) => acc + Math.pow(c.v - meanV, 2), 0) / totalCells;
    const varianceT = frame.cells.reduce((acc, c) => acc + Math.pow(c.t - meanT, 2), 0) / totalCells;
    const stdevV = Math.sqrt(varianceV) || 0.001; // Avoid divide-by-zero bounds
    const stdevT = Math.sqrt(varianceT) || 0.1;

    const outliers: OutlierCell[] = frame.cells
      .map((c, i) => {
        const vDelta = c.v - meanV;
        const tDelta = c.t - meanT;
        
        // Compute standard Z-Scores (Distance from moving pack average in standard deviations)
        const vZScore = vDelta / stdevV;
        const tZScore = tDelta / stdevT;

        // Flags trigger if cells cross absolute hardware boundaries OR display anomalous deviation profiles
        const isAnomalousHot = c.t > 38 || Math.abs(tZScore) > zThresh;
        const isAnomalousVoltage = c.v < 3.22 || Math.abs(vZScore) > zThresh;

        let severity: "critical" | "warning" | null = null;
        if (c.t > 42 || c.v < 3.0) severity = "critical";
        else if (isAnomalousHot || isAnomalousVoltage) severity = "warning";

        return { i, ...c, vDelta, tDelta, vZScore, tZScore, severity };
      })
      .filter((c): c is OutlierCell & { severity: "critical" | "warning" } => 
        c.severity !== null && !ignoredCellIndices.includes(c.i)
      )
      .sort((a, b) => Math.max(Math.abs(b.tZScore), Math.abs(b.vZScore)) - Math.max(Math.abs(a.tZScore), Math.abs(a.vZScore)));

    return { outliers, meanV, meanT, stdevV, stdevT };
  }, [frame.cells, ignoredCellIndices, zThresh]);

  const dangerousEvents = useMemo(() => {
    return events.filter((e) => e.lvl === "warn" || e.lvl === "danger");
  }, [events]);

  const toggleIgnoreCell = (idx: number) => {
    setIgnoredCellIndices((prev) => [...prev, idx]);
  };

  const removeIgnoredCell = (idx: number) => {
    setIgnoredCellIndices((prev) => prev.filter(i => i !== idx));
  };

  const exportAnomalyLog = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ timestamp: new Date().toISOString(), packId: frame.packId, baselineMetrics: cellAnalysis, detectedOutliers: cellAnalysis.outliers }));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `BMS_ANOMALY_SNAPSHOT_${frame.packId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <section className="grid grid-cols-12 gap-4 animate-fade-in">
      {/* Outlier Watchlist Monitor */}
      <div className="col-span-12 lg:col-span-8 panel p-5 flex flex-col justify-between bg-card/40 backdrop-blur-sm border border-border">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Dynamic Safety Watchlist</div>
              <h3 className="mt-0.5 text-sm font-medium flex items-center gap-2">
                <AlertOctagon className="h-4 w-4 text-warn" /> Outliers vs Pack Baseline
              </h3>
            </div>
            
            {/* Engineering Adjusters Bar */}
            <div className="flex flex-wrap items-center gap-3 text-mono text-[10px]">
              <div className="flex items-center gap-1.5 bg-secondary/30 px-2 py-1 rounded border border-border/40 text-muted-foreground">
                <SlidersHorizontal className="h-3 w-3 text-primary" />
                <span>Sensitivity ($\sigma$):</span>
                <input 
                  type="number" 
                  step="0.1" 
                  min="1.5" 
                  max="4.0" 
                  value={zThresh} 
                  onChange={(e) => setZThresh(parseFloat(e.target.value) || 2.5)} 
                  className="w-8 bg-transparent text-foreground border-none outline-none font-bold text-center p-0 ml-0.5"
                />
              </div>
              <div className="flex items-center gap-3 bg-secondary/20 px-2.5 py-1 rounded-md border border-border/60">
                <div><span className="text-muted-foreground">Mean V:</span> <span className="text-foreground font-medium">{cellAnalysis.meanV.toFixed(3)}V</span></div>
                <div className="w-px h-3 bg-border/60" />
                <div><span className="text-muted-foreground">Mean T:</span> <span className="text-foreground font-medium">{cellAnalysis.meanT.toFixed(1)}°C</span></div>
              </div>
              <button 
                onClick={exportAnomalyLog}
                className="flex items-center gap-1 border border-border hover:border-primary hover:text-primary transition-colors px-2 py-1 rounded cursor-pointer text-muted-foreground"
              >
                <Download className="h-3 w-3" /> EXPORT
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="text-mono mt-3 w-full text-xs min-w-[500px]">
              <thead className="text-muted-foreground border-b border-border/40">
                <tr className="text-left">
                  <th className="pb-2 font-normal">Cell Pin</th>
                  <th className="pb-2 font-normal">Voltage ($\Delta$V)</th>
                  <th className="pb-2 font-normal">Temp ($\Delta$T)</th>
                  <th className="pb-2 font-normal">SoC State</th>
                  <th className="pb-2 font-normal">Risk Class</th>
                  <th className="pb-2 font-normal text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {cellAnalysis.outliers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground font-sans">
                      <CheckCircle className="h-5 w-5 text-primary mx-auto mb-1.5 opacity-80" />
                      All balancing tracks nominal · No statistical variations detected at {zThresh.toFixed(1)}$\sigma$
                    </td>
                  </tr>
                )}
                {cellAnalysis.outliers.map((c) => (
                  <tr key={c.i} className="hover:bg-secondary/10 transition-colors group">
                    <td className="py-2.5 font-medium">#{String(c.i + 1).padStart(2, "0")}</td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-1">
                        <Gauge className="h-3 w-3 text-muted-foreground/50" />
                        <span className={c.v < 3.25 ? "text-warn font-medium" : "text-foreground"}>
                          {c.v.toFixed(3)}V
                        </span>
                        <span className="text-[10px] text-muted-foreground" title={`Z-Score: ${c.vZScore.toFixed(2)}`}>
                          ({c.vDelta >= 0 ? "+" : ""}{c.vDelta.toFixed(3)})
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-1">
                        <Thermometer className="h-3 w-3 text-muted-foreground/50" />
                        <span className={c.severity === "critical" ? "text-destructive font-semibold" : "text-warn font-medium"}>
                          {c.t.toFixed(1)}°C
                        </span>
                        <span className="text-[10px] text-muted-foreground" title={`Z-Score: ${c.tZScore.toFixed(2)}`}>
                          ({c.tDelta >= 0 ? "+" : ""}{c.tDelta.toFixed(1)}°C)
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 text-muted-foreground">{c.soc.toFixed(0)}%</td>
                    <td className="py-2.5">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase font-medium tracking-wide ${
                        c.severity === "critical" ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-warn/10 text-warn border border-warn/20"
                      }`}>
                        {c.severity}
                      </span>
                    </td>
                    <td className="py-2.5 text-right opacity-60 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => toggleIgnoreCell(c.i)}
                        className="inline-flex items-center gap-1 border border-border bg-background px-2 py-0.5 rounded text-[10px] hover:border-warn hover:text-warn transition-colors cursor-pointer"
                        title="Suppress notification for this execution loop"
                      >
                        <EyeOff className="h-2.5 w-2.5" /> suppress
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {ignoredCellIndices.length > 0 && (
          <div className="mt-4 text-[10px] text-muted-foreground border-t border-dashed border-border/60 pt-2 flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              <span>Suppressed Channels:</span>
              {ignoredCellIndices.map(i => (
                <span key={i} className="inline-flex items-center gap-0.5 bg-secondary/50 border border-border px-1 rounded text-foreground font-semibold">
                  #{i + 1}
                  <X className="h-2 w-2 text-muted-foreground hover:text-destructive cursor-pointer" onClick={() => removeIgnoredCell(i)} />
                </span>
              ))}
            </div>
            <button onClick={() => setIgnoredCellIndices([])} className="text-primary hover:underline cursor-pointer">Restore Matrix Layout</button>
          </div>
        )}
      </div>

      {/* Predictive ML Classification Metric Stack */}
      <div className="col-span-12 lg:col-span-4 space-y-4 flex flex-col">
        <div className="panel p-5 relative overflow-hidden bg-card/40 border border-border">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp className="h-16 w-16 text-primary" />
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Predictive ML Risk Core</div>
          <div className="text-mono mt-2.5 text-4xl font-semibold tracking-tight text-primary">
            {frame.riskScore.toFixed(4)}
          </div>
          <div className="text-mono mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
            Neural Ensemble v3.2 · Live classification threshold tracking within nominal constraints.
          </div>
        </div>
        
        <div className="flex-1 min-h-[250px] flex flex-col">
          <EventLog events={dangerousEvents.length ? dangerousEvents : events.slice(0, 8)} />
        </div>
      </div>
    </section>
  );
}

export function MaintenanceView({ assets }: { assets: FleetAsset[] }) {
  const [scheduledIds, setScheduledIds] = useState<string[]>([]);
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");

  // Dynamic sorting priority weighing critical risk states ahead of low baseline SoC values
  const optimizedQueue = useMemo(() => {
    const priorityWeight = { danger: 3, warn: 2, ok: 1 };
    return [...assets]
      .filter((asset) => {
        if (riskFilter === "all") return true;
        return asset.risk === riskFilter;
      })
      .sort((a, b) => priorityWeight[b.risk] - priorityWeight[a.risk] || a.soc - b.soc)
      .slice(0, 10);
  }, [assets, riskFilter]);

  const dispatchToServiceStation = (assetId: string) => {
    setScheduledIds((prev) => [...prev, assetId]);
  };

  return (
    <section className="panel p-5 animate-fade-in bg-card/40 border border-border">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Asset Optimization Engine</div>
          <h3 className="mt-0.5 text-sm font-medium flex items-center gap-2">
            <Hammer className="h-4 w-4 text-primary" /> Urgent Fleet Service Queue
          </h3>
        </div>
        
        {/* Risk Filtering Interface Matrix */}
        <div className="flex items-center gap-2 text-mono text-[10px]">
          <span className="text-muted-foreground flex items-center gap-1"><Filter className="h-3 w-3" /> Class:</span>
          <div className="flex rounded border border-border bg-background p-0.5">
            {(["all", "danger", "warn"] as RiskFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setRiskFilter(f)}
                className={`px-2 py-0.5 rounded capitalize transition-all cursor-pointer ${
                  riskFilter === f ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="text-muted-foreground border-l border-border pl-2 ml-1">
            Pending Orders: <span className="text-foreground font-bold">{optimizedQueue.length - scheduledIds.length}</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="text-mono w-full text-xs min-w-[600px]">
          <thead className="text-muted-foreground">
            <tr className="text-left border-b border-border/40">
              <th className="pb-2 font-normal">Asset Register</th>
              <th className="pb-2 font-normal">Assigned Operator</th>
              <th className="pb-2 font-normal">State of Charge</th>
              <th className="pb-2 font-normal">Risk Class</th>
              <th className="pb-2 font-normal text-right">Deployment Ticket</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {optimizedQueue.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground font-sans">
                  No assets currently match the specified operational risk filters.
                </td>
              </tr>
            )}
            {optimizedQueue.map((a) => {
              const isDispatched = scheduledIds.includes(a.id);
              
              return (
                <tr 
                  key={a.id} 
                  className={`transition-colors hover:bg-secondary/10 ${
                    isDispatched ? "opacity-50 bg-secondary/5" : ""
                  }`}
                >
                  <td className="py-3 font-medium text-foreground flex items-center gap-2">
                    <span className={`w-1 h-3 rounded-full ${
                      a.risk === "danger" ? "bg-destructive animate-pulse" : a.risk === "warn" ? "bg-warn" : "bg-primary"
                    }`} />
                    {a.id}
                  </td>
                  <td className="py-3 font-sans text-muted-foreground">{a.rider}</td>
                  <td className="py-3">
                    <span className={`font-semibold ${a.soc < 20 ? "text-destructive" : "text-foreground"}`}>
                      {a.soc.toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`text-[10px] uppercase tracking-wider font-semibold ${
                      a.risk === "danger" ? "text-destructive" : a.risk === "warn" ? "text-warn" : "text-primary"
                    }`}>
                      {a.risk}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => dispatchToServiceStation(a.id)}
                      disabled={isDispatched}
                      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md border transition-all ${
                        isDispatched
                          ? "border-border bg-secondary/10 text-muted-foreground cursor-not-allowed"
                          : "border-primary/30 bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary cursor-pointer"
                      }`}
                    >
                      {isDispatched ? (
                        <>
                          <CheckCircle className="h-3 w-3" /> dispatched
                        </>
                      ) : (
                        <>
                          <CalendarClock className="h-3 w-3" /> Issue Order
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function GenericView({ title, lines }: { title: string; lines: string[] }) {
  return (
    <section className="panel p-8 relative overflow-hidden bg-card/40 border border-border animate-fade-in">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Sub-System Registry Component</div>
      <h2 className="mt-1 text-lg font-medium text-foreground">{title}</h2>
      
      <ul className="text-mono mt-6 space-y-2.5 text-xs">
        {lines.map((l, index) => (
          <li 
            key={`${l}-${index}`} 
            className="flex items-start gap-3 border-b border-border/30 pb-2.5 last:border-0 hover:text-foreground transition-colors group"
          >
            <span className="text-primary font-bold group-hover:translate-x-0.5 transition-transform select-none">›</span>
            <span className="text-muted-foreground group-hover:text-foreground/90 transition-colors leading-relaxed">
              {l}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}