import { useEffect, useRef, useState } from "react";
import { clamp, rand } from "@/lib/bms/utils";

export function useFieldHistory(value: number, len = 80): number[] {
  const ref = useRef<number[]>(Array.from({ length: len }, () => value));
  const [, force] = useState(0);
  useEffect(() => {
    ref.current = [...ref.current.slice(1), value];
    force((n) => n + 1);
  }, [value, len]);
  return ref.current;
}

export function useSeries(len = 80, base = 50, amp = 8) {
  const [data, setData] = useState<number[]>(() =>
    Array.from({ length: len }, (_, i) => base + Math.sin(i / 4) * amp + rand(-2, 2)),
  );
  useEffect(() => {
    const i = setInterval(() => {
      setData((d) => [
        ...d.slice(1),
        clamp(d[d.length - 1] + rand(-3, 3), base - amp * 2, base + amp * 2),
      ]);
    }, 600);
    return () => clearInterval(i);
  }, [base, amp]);
  return data;
}

export function Sparkline({
  data,
  color = "var(--primary)",
  height = 80,
  fill = true,
  label,
}: {
  data: number[];
  color?: string;
  height?: number;
  fill?: boolean;
  label?: string;
}) {
  const w = 600,
    h = height;
  const min = Math.min(...data),
    max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 8) - 4}`)
    .join(" ");
  const area = `0,${h} ${pts} ${w},${h}`;
  return (
    <div className="relative">
      {label && (
        <div className="absolute left-0 top-0 z-10 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </div>
      )}
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id={`g-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {fill && <polygon points={area} fill={`url(#g-${color})`} />}
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
      </svg>
    </div>
  );
}
