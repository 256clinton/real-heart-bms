import { clamp } from "@/lib/bms/utils";

export type Cell = { v: number; t: number; soc: number };

export function CellMatrix({ cells }: { cells: Cell[] }) {
  const cols = 14;
  const minV = Math.min(...cells.map((c) => c.v));
  const maxV = Math.max(...cells.map((c) => c.v));
  const delta = ((maxV - minV) * 1000).toFixed(0);

  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Cell Matrix · 14S4P</div>
          <h3 className="mt-0.5 text-sm font-medium">LFP Pack — 56 cells</h3>
        </div>
        <div className="flex items-center gap-4 text-mono text-xs">
          <div><span className="text-muted-foreground">ΔV</span> <span className="text-primary">{delta} mV</span></div>
          <div><span className="text-muted-foreground">Vmin</span> <span>{minV.toFixed(3)}</span></div>
          <div><span className="text-muted-foreground">Vmax</span> <span>{maxV.toFixed(3)}</span></div>
        </div>
      </div>

      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {cells.map((c, i) => {
          const ratio = (c.v - 3.2) / (3.45 - 3.2);
          const hot = c.t > 38;
          return (
            <div
              key={i}
              className="group relative aspect-[3/4] rounded-sm border border-border/60 bg-secondary/40 p-1"
              title={`Cell ${i + 1}: ${c.v.toFixed(3)}V · ${c.t.toFixed(1)}°C`}
            >
              <div
                className="absolute inset-x-1 bottom-1 rounded-[2px] transition-all"
                style={{
                  height: `${clamp(ratio * 100, 4, 100)}%`,
                  background: hot
                    ? "oklch(0.65 0.24 25)"
                    : "linear-gradient(180deg, oklch(0.78 0.21 145), oklch(0.55 0.18 160))",
                  boxShadow: hot
                    ? "0 0 8px oklch(0.65 0.24 25 / 0.6)"
                    : "0 0 6px oklch(0.78 0.21 145 / 0.35)",
                }}
              />
              <div className="text-mono relative text-[8px] text-muted-foreground/80">{i + 1}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-4 text-[10px] text-muted-foreground text-mono">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-primary" /> nominal</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-destructive" /> thermal warn (&gt;38°C)</span>
        <span className="ml-auto">balancing: passive · 64mA</span>
      </div>
    </div>
  );
}
