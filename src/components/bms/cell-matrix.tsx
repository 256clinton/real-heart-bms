import { clamp } from "@/lib/bms/utils";
import { useMemo, useState } from "react";

export type Cell = { v: number; t: number; soc: number };

interface CellMatrixProps {
  cells: Cell[];
}

export function CellMatrix({ cells }: CellMatrixProps) {
  const cols = 14;
  const [hoveredCell, setHoveredCell] = useState<{ data: Cell; idx: number } | null>(null);

  // ==========================================
  // PERFORMANCE FIXED: MEMOIZED AGGREGATIONS WITH SAFE ARRAYS GUARDS
  // ==========================================
  const stats = useMemo(() => {
    if (!cells || cells.length === 0) {
      return { minV: 0, maxV: 0, delta: "0", totalCells: 0 };
    }

    let min = cells[0].v;
    let max = cells[0].v;
    const len = cells.length;

    // Single-pass imperative loop for ultimate performance over high-frequency tick streams
    for (let i = 1; i < len; i++) {
      const v = cells[i].v;
      if (v < min) min = v;
      if (v > max) max = v;
    }

    return {
      minV: min,
      maxV: max,
      delta: ((max - min) * 1000).toFixed(0),
      totalCells: len,
    };
  }, [cells]);

  return (
    <div className="panel p-5 bg-card/40 border border-border/80 rounded-lg shadow-xs relative">
      {/* Matrix Status Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
            Cell Matrix · 14S4P Architecture
          </div>
          <h3 className="mt-0.5 text-sm font-medium tracking-tight">
            Lithium Iron Phosphate (LFP) Grid — {stats.totalCells} Active Nodes
          </h3>
        </div>
        <div className="flex items-center gap-4 text-mono text-xs border border-border/40 rounded-md bg-secondary/20 px-3 py-1.5">
          <div>
            <span className="text-muted-foreground">ΔV</span>{" "}
            <span className="text-primary font-bold">{stats.delta} mV</span>
          </div>
          <div className="h-3 w-[1px] bg-border/60" />
          <div>
            <span className="text-muted-foreground">Vmin</span>{" "}
            <span className="font-medium text-foreground">{stats.minV.toFixed(3)}V</span>
          </div>
          <div className="h-3 w-[1px] bg-border/60" />
          <div>
            <span className="text-muted-foreground">Vmax</span>{" "}
            <span className="font-medium text-foreground">{stats.maxV.toFixed(3)}V</span>
          </div>
        </div>
      </div>

      {/* Advanced High-Density Grid */}
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {cells.map((c, i) => {
          // LFP Volumetric curves limits: 3.2V (empty) to 3.45V (nominal upper charge saturation)
          const ratio = (c.v - 3.2) / (3.45 - 3.2);
          const isHot = c.t > 38;

          return (
            <div
              key={i}
              onMouseEnter={() => setHoveredCell({ data: c, idx: i })}
              onMouseLeave={() => setHoveredCell(null)}
              className={`group relative aspect-[3/4] rounded-sm border transition-all duration-150 bg-secondary/30 p-1 flex flex-col justify-between cursor-crosshair ${
                isHot 
                  ? "border-destructive/40 hover:border-destructive/80 hover:ring-1 hover:ring-destructive/30" 
                  : "border-border/60 hover:border-primary/80 hover:ring-1 hover:ring-primary/30"
              }`}
            >
              {/* Internal Capacity Level Modulator */}
              <div
                className="absolute inset-x-0.5 bottom-0.5 rounded-[2px] transition-all duration-300 ease-out"
                style={{
                  height: `${clamp(ratio * 100, 5, 98)}%`,
                  background: isHot
                    ? "oklch(0.60 0.22 25)" // Saturated Warning Thermal Orange-Red
                    : "linear-gradient(180deg, oklch(0.72 0.19 145), oklch(0.52 0.16 160))", // Nominal LFP Cyan-Green
                  boxShadow: isHot
                    ? "0 0 6px oklch(0.60 0.22 25 / 0.4)"
                    : "0 0 4px oklch(0.72 0.19 145 / 0.2)",
                }}
              />
              
              {/* Cell Address Index Label */}
              <div className="text-mono relative z-10 text-[8px] font-semibold text-muted-foreground/80 group-hover:text-foreground transition-colors">
                {(i + 1).toString().padStart(2, "0")}
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Ultra-Fast Hardware Live Floating Tooltip Panel */}
      {hoveredCell && (
        <div className="absolute z-50 text-mono text-[11px] bg-popover border border-border p-2.5 rounded shadow-lg -translate-y-full top-0 left-1/2 -translate-x-1/2 pointer-events-none min-w-[160px] animate-in fade-in zoom-in-95 duration-100">
          <div className="font-bold border-b border-border/60 pb-1 mb-1.5 text-foreground flex justify-between">
            <span>CELL NODE</span>
            <span className="text-primary">#{(hoveredCell.idx + 1).toString().padStart(2, "0")}</span>
          </div>
          <div className="space-y-0.5 text-muted-foreground">
            <div className="flex justify-between"><span>Voltage:</span> <span className="text-foreground font-semibold">{hoveredCell.data.v.toFixed(3)} V</span></div>
            <div className="flex justify-between"><span>Thermal State:</span> <span className={`font-semibold ${hoveredCell.data.t > 38 ? "text-destructive" : "text-foreground"}`}>{hoveredCell.data.t.toFixed(1)} °C</span></div>
            <div className="flex justify-between"><span>State of Charge:</span> <span className="text-foreground font-semibold">{hoveredCell.data.soc.toFixed(1)} %</span></div>
          </div>
        </div>
      )}

      {/* Context Footnotes & Metadata Footer */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-muted-foreground text-mono border-t border-border/40 pt-3">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-xs bg-linear-to-b from-[oklch(0.72_0.19_145)] to-[oklch(0.52_0.16_160)]" /> Nominal Spectrum
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-xs bg-[oklch(0.60_0.22_25)] animate-pulse" /> Thermal Overload Exceedance (&gt;38°C)
        </span>
        <span className="sm:ml-auto font-medium text-foreground bg-secondary/40 px-2 py-0.5 rounded border border-border/30">
          Balancing Vector: Passive Resistor · 64mA Switched
        </span>
      </div>
    </div>
  );
}