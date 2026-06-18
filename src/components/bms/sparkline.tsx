import { useEffect, useRef, useState, useId, useMemo } from "react";
import { clamp, rand } from "@/lib/bms/utils";

/**
 * Tracks historical numeric data variations efficiently.
 */
export function useFieldHistory(value: number, len = 80): number[] {
  const [history, setHistory] = useState<number[]>(() => Array.from({ length: len }, () => value));

  useEffect(() => {
    setHistory((prev) => {
      const next = [...prev.slice(1), value];
      return next.length > len ? next.slice(-len) : next;
    });
  }, [value, len]);

  return history;
}

/**
 * Generates smooth synthetic random walks for telemetry simulation.
 */
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

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  fill?: boolean;
  label?: string;
  smooth?: boolean; // Smooth paths out using cubic bezier strings
}

export function Sparkline({
  data,
  color = "var(--primary)",
  height = 80,
  fill = true,
  label,
  smooth = true,
}: SparklineProps) {
  const uniqueGradientId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const w = 600;
  const h = height;

  // Calculate static metrics accurately across frame vectors
  const metrics = useMemo(() => {
    if (!data || data.length === 0) return { points: [], ptsString: "", areaString: "", min: 0, max: 0, current: 0 };
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const current = data[data.length - 1];

    const points = data.map((v, i) => ({
      x: (i / (data.length - 1)) * w,
      y: h - ((v - min) / range) * (h - 8) - 4,
      val: v
    }));

    const ptsString = points.map(p => `${p.x},${p.y}`).join(" ");
    const areaString = `0,${h} ${ptsString} ${w},${h}`;

    return { points, ptsString, areaString, min, max, current };
  }, [data, h]);

  // Generate continuous bezier command hooks for sleek hardware aesthetics
  const smoothPath = useMemo(() => {
    if (metrics.points.length < 2) return "";
    return metrics.points.reduce((acc, p, i, a) => {
      if (i === 0) return `M ${p.x},${p.y}`;
      const cpX1 = a[i - 1].x + (p.x - a[i - 1].x) / 3;
      const cpY1 = a[i - 1].y;
      const cpX2 = a[i - 1].x + 2 * ((p.x - a[i - 1].x) / 3);
      const cpY2 = p.y;
      return `${acc} C ${cpX1},${cpY1} ${cpX2},${cpY2} ${p.x},${p.y}`;
    }, "");
  }, [metrics.points]);

  const smoothAreaPath = `${smoothPath} L ${w},${h} L 0,${h} Z`;

  // Handle live alignment tracking on coordinate hover frames
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!containerRef.current || metrics.points.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const normalizedX = ((e.clientX - rect.left) / rect.width) * w;
    
    // Find closest historical array match index location
    let closestIdx = 0;
    let minDistance = Math.abs(metrics.points[0].x - normalizedX);
    
    for (let i = 1; i < metrics.points.length; i++) {
      const dist = Math.abs(metrics.points[i].x - normalizedX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = i;
      }
    }
    setHoverIndex(closestIdx);
  };

  return (
    <div ref={containerRef} className="relative group/sparkline w-full">
      {/* Upper Context Header Interface */}
      <div className="absolute left-0 top-0 z-10 w-full flex justify-between pointer-events-none text-mono text-[10px]">
        {label && (
          <div className="uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </div>
        )}
        <div className="text-right text-muted-foreground/80 opacity-0 group-hover/sparkline:opacity-100 transition-opacity duration-150">
          {hoverIndex !== null && metrics.points[hoverIndex] ? (
            <span>TRACK: <span className="text-foreground font-semibold">{metrics.points[hoverIndex].val.toFixed(2)}</span></span>
          ) : (
            <span>LIVE: <span className="text-primary font-semibold">{metrics.current.toFixed(2)}</span></span>
          )}
        </div>
      </div>

      {/* Primary SVG Render Element */}
      <svg 
        viewBox={`0 0 ${w} ${h}`} 
        preserveAspectRatio="none" 
        className="h-full w-full overflow-visible cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id={`g-${uniqueGradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Dynamic Waveform paths */}
        {fill && metrics.points.length > 0 && (
          <path 
            d={smooth ? smoothAreaPath : `M ${metrics.areaString}`} 
            fill={`url(#g-${uniqueGradientId})`} 
            className="transition-all duration-300"
          />
        )}
        
        {smooth ? (
          <path d={smoothPath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        ) : (
          <polyline points={metrics.ptsString} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        )}

        {/* Hover Coordinate Crosshairs */}
        {hoverIndex !== null && metrics.points[hoverIndex] && (
          <g>
            <line 
              x1={metrics.points[hoverIndex].x} 
              y1={0} 
              x2={metrics.points[hoverIndex].x} 
              y2={h} 
              stroke="var(--border)" 
              strokeWidth="1" 
              strokeDasharray="3,3" 
            />
            <circle 
              cx={metrics.points[hoverIndex].x} 
              cy={metrics.points[hoverIndex].y} 
              r="3.5" 
              fill={color} 
              stroke="var(--background)" 
              strokeWidth="1.5" 
            />
          </g>
        )}
      </svg>
    </div>
  );
}