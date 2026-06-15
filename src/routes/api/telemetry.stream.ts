import { createFileRoute } from "@tanstack/react-router";

// ---------- simulation core (server-side) ----------
// Stateful simulator so successive ticks evolve realistically.
type Cell = { v: number; t: number; soc: number };

const NUM_CELLS = 14 * 4;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const rand = (min: number, max: number) => Math.random() * (max - min) + min;

function initCells(): Cell[] {
  return Array.from({ length: NUM_CELLS }, () => ({
    v: rand(3.28, 3.34),
    t: rand(28, 33),
    soc: rand(76, 80),
  }));
}

function stepCells(cells: Cell[]): Cell[] {
  return cells.map((c) => ({
    v: clamp(c.v + rand(-0.004, 0.004), 3.2, 3.45),
    t: clamp(c.t + rand(-0.2, 0.25), 26, 42),
    soc: clamp(c.soc + rand(-0.05, 0.02), 0, 100),
  }));
}

type Frame = {
  ts: number;
  packId: string;
  cells: Cell[];
  current: number;     // A
  power: number;       // W
  rssi: number;        // dBm
  rttMs: number;
  riskScore: number;
};

function buildFrame(cells: Cell[]): Frame {
  const avgV = cells.reduce((a, c) => a + c.v, 0) / cells.length;
  const current = 12 + Math.sin(Date.now() / 800) * 2 + rand(-0.4, 0.4);
  return {
    ts: Date.now(),
    packId: "UG-KLA-00284",
    cells,
    current: +current.toFixed(2),
    power: +(avgV * 14 * current).toFixed(1),
    rssi: -67 + Math.round(rand(-3, 3)),
    rttMs: 22 + Math.round(rand(-4, 10)),
    riskScore: +clamp(0.04 + rand(-0.01, 0.02), 0, 1).toFixed(3),
  };
}

// ---------- SSE stream ----------
export const Route = createFileRoute("/api/telemetry/stream")({
  server: {
    handlers: {
      GET: async () => {
        const encoder = new TextEncoder();
        let cells = initCells();
        let interval: ReturnType<typeof setInterval> | undefined;

        const stream = new ReadableStream({
          start(controller) {
            const send = (data: unknown) => {
              try {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
              } catch {
                if (interval) clearInterval(interval);
              }
            };

            // initial frame
            send(buildFrame(cells));

            interval = setInterval(() => {
              cells = stepCells(cells);
              send(buildFrame(cells));
            }, 800);
          },
          cancel() {
            if (interval) clearInterval(interval);
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
