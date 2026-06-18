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
export type ActiveProtocol = "websocket" | "sse" | "simulation";

interface TelemetryStreamOptions {
  paused?: boolean;
  preferredProtocol?: "ws" | "sse";
  maxFrameRate?: number; // Caps rendering cycles (default: 60fps)
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const rand = (min: number, max: number) => Math.random() * (max - min) + min;

/**
 * Advanced simulation pipeline mimicking a live Lithium Iron Phosphate (LFP) 14S4P setup.
 * Processes individual physical cell nodes and computes mathematical safety alerts dynamically.
 */
function simulatedFrame(prev?: TelemetryFrame): TelemetryFrame {
  const cells =
    prev?.cells.map((c) => ({
      v: clamp(c.v + rand(-0.003, 0.003), 2.9, 3.45), // Structural LFP cell voltage curve bounds
      t: clamp(c.t + rand(-0.15, 0.22), 25, 45),
      soc: clamp(c.soc + rand(-0.02, 0.01), 0, 100),
    })) ??
    Array.from({ length: 56 }, () => ({
      v: rand(3.28, 3.34),
      t: rand(28, 32),
      soc: rand(75, 80),
    }));

  // Perform operational metrics sweep
  const voltages = cells.map((c) => c.v);
  const minV = Math.min(...voltages);
  const maxV = Math.max(...voltages);
  const maxT = Math.max(...cells.map((c) => c.t));
  const deltaV = maxV - minV;

  // Real-time Algorithmic Risk Calculations
  let riskScore = 0.02;
  if (maxT > 42 || minV < 3.0) riskScore += 0.65; // Thermal Runaway or Critical Under-voltage Deep Discharge
  if (deltaV > 0.080) riskScore += 0.25;          // Structural Pack Cell Imbalance Penalty
  riskScore = clamp(riskScore + rand(-0.01, 0.01), 0, 1);

  const avgV = voltages.reduce((a, b) => a + b, 0) / cells.length;
  const current = 14 + Math.sin(Date.now() / 1000) * 3;

  return {
    ts: Date.now(),
    packId: prev?.packId ?? "UG-KLA-00284",
    cells,
    current: +current.toFixed(2),
    power: +(avgV * 14 * current).toFixed(1),
    rssi: Math.floor(rand(-72, -61)),
    rttMs: Math.floor(rand(18, 36)),
    riskScore: +riskScore.toFixed(4),
  };
}

export function useTelemetryStream(url = "/api/telemetry/stream", opts: TelemetryStreamOptions = {}) {
  const [frame, setFrame] = useState<TelemetryFrame>(() => simulatedFrame());
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const [protocol, setProtocol] = useState<ActiveProtocol>("websocket");

  // Thread and socket lifecycle allocation slots
  const wsRef = useRef<WebSocket | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const fallbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const retryCount = useRef(0);
  const pausedRef = useRef(opts.paused ?? false);
  const lastRenderTime = useRef<number>(0);
  const frameThrottlingWindow = 1000 / (opts.maxFrameRate ?? 60);

  // Sync execution flags without tearing down main stream threads
  useEffect(() => {
    pausedRef.current = opts.paused ?? false;
  }, [opts.paused]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let isSubscribed = true;

    // Fast-path frame resolution layout engine
    const processIncomingTelemetry = (data: TelemetryFrame) => {
      if (pausedRef.current || !isSubscribed) return;

      const rightNow = performance.now();
      if (rightNow - lastRenderTime.current >= frameThrottlingWindow) {
        lastRenderTime.current = rightNow;

        // Decouple network stack evaluation from window repaint loops
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = requestAnimationFrame(() => {
          setFrame(data);
        });
      }
    };

    const startSimulationPipeline = () => {
      if (fallbackIntervalRef.current) return;
      setProtocol("simulation");
      fallbackIntervalRef.current = setInterval(() => {
        setFrame((prev) => {
          const next = simulatedFrame(prev);
          processIncomingTelemetry(next);
          return next;
        });
      }, 500); // Stable 2Hz internal clock pulse configuration
    };

    const stopSimulationPipeline = () => {
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
    };

    const terminateNetworkChannels = () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };

    const triggerPipelineCascadingFallback = () => {
      terminateNetworkChannels();
      if (!isSubscribed) return;

      retryCount.current += 1;
      setStatus("reconnecting");
      startSimulationPipeline();

      // Adaptive exponential network retry backoff matrix (max bounded limit 10s)
      const nextDelay = Math.min(10000, 500 * Math.pow(2, Math.min(retryCount.current, 4)));
      reconnectTimeoutRef.current = setTimeout(connectTelemetryPipeline, nextDelay);
    };

    const connectTelemetryPipeline = () => {
      if (!isSubscribed) return;
      setStatus(retryCount.current === 0 ? "connecting" : "reconnecting");

      const targetUrlIsWs = url.startsWith("ws://") || url.startsWith("wss://");

      // Path Option A: Native High-Performance Duplex WebSocket Session
      if (opts.preferredProtocol !== "sse" && targetUrlIsWs) {
        setProtocol("websocket");
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          retryCount.current = 0;
          stopSimulationPipeline();
          setStatus("live");
        };

        ws.onmessage = (event) => {
          try {
            processIncomingTelemetry(JSON.parse(event.data) as TelemetryFrame);
          } catch { /* Intercept framing exceptions safely */ }
        };

        ws.onerror = ws.onclose = () => triggerPipelineCascadingFallback();
        return;
      }

      // Path Option B: Standard Server-Sent Events (SSE) Fallback Structure
      setProtocol("sse");
      const normalizedSseRoute = url.replace(/^ws(s)?:\/\//, "http$1://");
      const es = new EventSource(normalizedSseRoute);
      esRef.current = es;

      es.onopen = () => {
        retryCount.current = 0;
        stopSimulationPipeline();
        setStatus("live");
      };

      es.onmessage = (event) => {
        try {
          processIncomingTelemetry(JSON.parse(event.data) as TelemetryFrame);
        } catch { /* Absorb parse failures gracefully */ }
      };

      es.onerror = () => triggerPipelineCascadingFallback();
    };

    connectTelemetryPipeline();

    // Structural component clean up routine
    return () => {
      isSubscribed = false;
      terminateNetworkChannels();
      stopSimulationPipeline();

      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [url, opts.preferredProtocol, opts.maxFrameRate]);

  return { frame, status, protocol };
}