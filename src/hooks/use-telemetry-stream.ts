import { useEffect, useRef, useState } from "react";

export type TelemetryCell = { v: number; t: number; soc: number };
export type TelemetryFrame = {
  ts: number;
  packId: string;
  cells: TelemetryCell[];
  current: number;
  power: number;
  rssi: number;
  rttMs: number;
  riskScore: number;
};

export type StreamStatus = "connecting" | "live" | "reconnecting" | "offline";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const rand = (min: number, max: number) => Math.random() * (max - min) + min;

function simulatedFrame(prev?: TelemetryFrame): TelemetryFrame {
  const cells =
    prev?.cells.map((c) => ({
      v: clamp(c.v + rand(-0.004, 0.004), 3.2, 3.45),
      t: clamp(c.t + rand(-0.2, 0.25), 26, 42),
      soc: clamp(c.soc + rand(-0.05, 0.02), 0, 100),
    })) ??
    Array.from({ length: 56 }, () => ({
      v: rand(3.28, 3.34),
      t: rand(28, 33),
      soc: rand(76, 80),
    }));
  const avgV = cells.reduce((a, c) => a + c.v, 0) / cells.length;
  const current = 12 + Math.sin(Date.now() / 800) * 2;
  return {
    ts: Date.now(),
    packId: "UG-KLA-00284",
    cells,
    current: +current.toFixed(2),
    power: +(avgV * 14 * current).toFixed(1),
    rssi: -67,
    rttMs: 24,
    riskScore: 0.04,
  };
}

export function useTelemetryStream(url = "/api/telemetry/stream", opts: { paused?: boolean } = {}) {
  const [frame, setFrame] = useState<TelemetryFrame>(() => simulatedFrame());
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const esRef = useRef<EventSource | null>(null);
  const fallbackRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryRef = useRef(0);
  const pausedRef = useRef(opts.paused ?? false);

  // keep pausedRef in sync with prop without re-triggering effect
  useEffect(() => {
    pausedRef.current = opts.paused ?? false;
  }, [opts.paused]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    const startFallback = () => {
      if (fallbackRef.current) return;
      fallbackRef.current = setInterval(() => {
        if (pausedRef.current) return;
        setFrame((prev) => simulatedFrame(prev));
      }, 900);
    };
    const stopFallback = () => {
      if (fallbackRef.current) {
        clearInterval(fallbackRef.current);
        fallbackRef.current = null;
      }
    };

    const connect = () => {
      if (cancelled) return;
      setStatus(retryRef.current === 0 ? "connecting" : "reconnecting");
      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        retryRef.current = 0;
        stopFallback();
        setStatus("live");
      };

      es.onmessage = (e) => {
        if (pausedRef.current) return;
        try {
          const data = JSON.parse(e.data) as TelemetryFrame;
          setFrame(data);
        } catch {
          /* ignore malformed */
        }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        if (cancelled) return;
        retryRef.current += 1;
        setStatus("reconnecting");
        startFallback();
        // exponential backoff capped at 8s
        const delay = Math.min(8000, 500 * 2 ** Math.min(retryRef.current, 4));
        setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      cancelled = true;
      esRef.current?.close();
      stopFallback();
    };
  }, [url]);

  return { frame, status };
}
