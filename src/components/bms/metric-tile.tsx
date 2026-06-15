export function MetricTile({
  label,
  value,
  unit,
  icon: Icon,
  accent = "primary",
  sub,
}: {
  label: string;
  value: string;
  unit?: string;
  icon: any;
  accent?: "primary" | "info" | "warn";
  sub?: string;
}) {
  const color =
    accent === "primary" ? "text-primary" : accent === "warn" ? "text-warn" : "text-accent";
  return (
    <div className="panel relative overflow-hidden p-5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className={`text-mono text-3xl font-medium ${color}`}>{value}</span>
            {unit && <span className="text-mono text-xs text-muted-foreground">{unit}</span>}
          </div>
          {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
        </div>
        <Icon className={`h-5 w-5 ${color} opacity-80`} />
      </div>
    </div>
  );
}
