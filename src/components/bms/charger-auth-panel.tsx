import { useEffect, useState, useMemo } from "react";
import { AlertTriangle, BatteryCharging, KeyRound, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { setChargeStatus } from "@/lib/bms/charge-status";

type PairedCharger = { id: string; label: string; fingerprint: string; pairedAt: number };

const INITIAL_PAIRED: PairedCharger[] = [
  { id: "CHG-SPIRO-KLA-001", label: "Spiro Swap Station · Kampala HQ", fingerprint: "ed25519:9F2A…11C7", pairedAt: Date.now() - 86400000 * 12 },
  { id: "CHG-SPIRO-NTB-004", label: "Spiro Swap Station · Ntinda",     fingerprint: "ed25519:71B0…44E9", pairedAt: Date.now() - 86400000 * 3 },
];

const CANDIDATE_CHARGERS = [
  { id: "CHG-SPIRO-KLA-001", label: "Spiro Swap Station · Kampala HQ", fingerprint: "ed25519:9F2A…11C7", trusted: true },
  { id: "CHG-SPIRO-NTB-004", label: "Spiro Swap Station · Ntinda",     fingerprint: "ed25519:71B0…44E9", trusted: true },
  { id: "CHG-UNKNOWN-X19",   label: "Unknown 72V charger",             fingerprint: "ed25519:AA31…0F2D", trusted: false },
  { id: "CHG-CLONE-FAKE",    label: "Cloned Spiro charger (spoofed)",  fingerprint: "ed25519:9F2A…11C7", trusted: false },
];

type AuthState = "idle" | "challenge" | "verify" | "granted" | "denied";

const PHASE_META = {
  idle:      { color: "text-muted-foreground", bg: "border-border bg-secondary/30", label: "IDLE · awaiting charger" },
  challenge: { color: "text-accent",           bg: "border-accent/40 bg-accent/5",   label: "CHALLENGE · nonce sent" },
  verify:    { color: "text-accent",           bg: "border-accent/50 bg-accent/5",   label: "VERIFY · checking signature" },
  granted:   { color: "text-primary",          bg: "border-primary/60 bg-primary/5",  label: "GRANTED · charging enabled" },
  denied:    { color: "text-destructive",      bg: "border-destructive/60 bg-destructive/5", label: "DENIED · charge MOSFET open" },
};

export function ChargerAuthPanel() {
  const [paired, setPaired] = useState<PairedCharger[]>(INITIAL_PAIRED);
  const [attemptIdx, setAttemptIdx] = useState<number>(0);
  const [phase, setPhase] = useState<AuthState>("idle");
  const [pairMode, setPairMode] = useState<boolean>(false);

  // Compute active target candidates deterministically
  const current = useMemo(() => {
    return CANDIDATE_CHARGERS[attemptIdx % CANDIDATE_CHARGERS.length];
  }, [attemptIdx]);

  // Decoupled structural state lookups optimizing re-render computations
  const isPaired = useMemo(() => {
    return paired.some((p) => p.id === current.id && p.fingerprint === current.fingerprint);
  }, [paired, current]);

  // Centralized hardware authentication state tracking lifecycle effect
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    // Helper to safely transition state machine targets across aborted handshakes
    const stepTimeout = (targetPhase: AuthState, ms: number) => {
      return new Promise<void>((resolve) => {
        const timeoutId = setTimeout(() => {
          if (!signal.aborted) {
            setPhase(targetPhase);
          }
          resolve();
        }, ms);
        
        signal.addEventListener("abort", () => clearTimeout(timeoutId));
      });
    };

    // Asynchronous sequence evaluating crypto challenge transitions sequentially
    const runHandshakeSequence = async () => {
      setPhase("challenge");
      await stepTimeout("verify", 700);
      if (signal.aborted) return;

      await stepTimeout(
        pairMode && current.trusted
          ? "granted"
          : isPaired && current.trusted
          ? "granted"
          : "denied",
        800
      );
      if (signal.aborted) return;

      // Persist trust pair assignments safely inside authorization success triggers
      if (pairMode && current.trusted) {
        setPaired((prev) => {
          const exists = prev.some((x) => x.id === current.id);
          if (exists) return prev;
          return [...prev, { id: current.id, label: current.label, fingerprint: current.fingerprint, pairedAt: Date.now() }];
        });
        setPairMode(false);
      }

      await stepTimeout("idle", 3000);
    };

    runHandshakeSequence();

    return () => {
      controller.abort();
    };
  }, [attemptIdx, pairMode, isPaired, current]);

  // Dispatches safety interlocking notifications down to peripheral system monitors
  useEffect(() => {
    const statusPayloads: Record<AuthState, () => Parameters<typeof setChargeStatus>[0]> = {
      granted: () => ({
        allowed: true,
        reason: "Charge enabled",
        detail: `Paired charger ${current.id} authenticated. MOSFET closed.`,
        sourceId: current.id,
      }),
      denied: () => {
        const reasonStr = !current.trusted
          ? current.id.includes("CLONE")
            ? "Cloned key — signature replay detected"
            : "Unknown charger — key not in trust store"
          : !isPaired
          ? "Charger not paired with this pack"
          : "Handshake signature validation failure";
        return {
          allowed: false,
          reason: "Charge blocked",
          detail: `${reasonStr}. Charge MOSFET held open.`,
          sourceId: current.id,
        };
      },
      challenge: () => ({
        allowed: false,
        reason: "Verifying charger",
        detail: `Challenge/response transaction context open with ${current.id}.`,
        sourceId: current.id,
      }),
      verify: () => ({
        allowed: false,
        reason: "Verifying charger",
        detail: `Validating cryptographic telemetry packet proofs from ${current.id}.`,
        sourceId: current.id,
      }),
      idle: () => ({
        allowed: false,
        reason: "Awaiting charger",
        detail: "No live charge hardware pipeline attached. Relays safe.",
        sourceId: undefined,
      }),
    };

    setChargeStatus(statusPayloads[phase]());
  }, [phase, current, isPaired]);

  const unpair = (id: string) => setPaired((p) => p.filter((x) => x.id !== id));
  const simulateNext = () => setAttemptIdx((i) => i + 1);

  const activeMeta = PHASE_META[phase];

  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Charge Source Authorization</div>
          <h3 className="mt-0.5 text-sm font-medium flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" /> Cryptographic trust bounds
          </h3>
        </div>
        <span className={`text-mono text-[10px] font-medium px-2 py-0.5 rounded border transition-all duration-300 ${activeMeta.color} ${activeMeta.bg.split(" ")[0]}`}>
          {activeMeta.label}
        </span>
      </div>

      <div className={`rounded-md border p-3 transition-all duration-300 ${activeMeta.bg}`}>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <BatteryCharging className={`h-4 w-4 transition-colors ${phase === "denied" ? "text-destructive" : "text-primary"}`} />
            <span className="text-foreground font-medium">{current.label}</span>
          </div>
          <span className="text-mono text-[10px] text-muted-foreground">{current.id}</span>
        </div>
        
        <div className="text-mono mt-2 flex justify-between text-[10px] text-muted-foreground/80">
          <span>sig_fp: {current.fingerprint}</span>
          <div className="flex items-center gap-1">
            {isPaired ? <span className="text-primary font-medium">paired</span> : <span className="text-warn">unpaired</span>}
            <span>·</span>
            {current.trusted ? <span className="text-muted-foreground">key_valid</span> : <span className="text-destructive font-medium">key_untrusted</span>}
          </div>
        </div>

        {/* Dynamic Context Interlock Alarm Interface */}
        {phase === "denied" && (
          <div className="mt-2.5 pt-2 border-t border-destructive/10 flex items-center gap-1.5 text-[11px] text-destructive animate-fade-in">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>Hardware enforcement action: MOSFET locked open. Source rejected.</span>
          </div>
        )}
        {(phase === "challenge" || phase === "verify") && (
          <div className="mt-2.5 pt-2 border-t border-accent/10 flex items-center gap-1.5 text-[11px] text-accent">
            <Loader2 className="h-3 w-3 animate-spin shrink-0" />
            <span>Processing dynamic challenge payload validation...</span>
          </div>
        )}
        {phase === "granted" && (
          <div className="mt-2.5 pt-2 border-t border-primary/10 flex items-center gap-1.5 text-[11px] text-primary">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span>Mutual verification confirmed. Closed internal charge path.</span>
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        <button
          onClick={simulateNext}
          className="col-span-3 rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-mono text-[11px] text-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
        >
          Cycle next candidate hardware
        </button>
        <button
          onClick={() => { setPairMode(true); simulateNext(); }}
          className="col-span-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-1.5 text-mono text-[11px] text-primary hover:bg-primary/20 transition-colors text-center font-medium cursor-pointer"
          title="Pair connecting charger if signed with valid platform certificate"
        >
          + Pair
        </button>
      </div>

      <div className="mt-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2 font-medium">
          System Registry Stores ({paired.length})
        </div>
        <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          {paired.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-md border border-border bg-secondary/20 px-2.5 py-1.5 text-mono text-[11px] transition-all hover:bg-secondary/30">
              <div className="min-w-0 pr-2">
                <div className="text-xs font-sans text-foreground truncate">{p.label}</div>
                <div className="text-[10px] text-muted-foreground truncate mt-0.5">{p.id} · {p.fingerprint}</div>
              </div>
              <button
                onClick={() => unpair(p.id)}
                className="shrink-0 inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground hover:border-destructive hover:text-destructive transition-colors cursor-pointer"
              >
                <XCircle className="h-2.5 w-2.5" /> revoke
              </button>
            </li>
          ))}
          {paired.length === 0 && (
            <li className="text-mono text-[11px] border border-dashed border-warn/30 bg-warn/5 rounded-md p-3 text-warn text-center">
              CRITICAL: Zero paired records loaded. Pack will isolate internal cell matrices under all input charge potentials.
            </li>
          )}
        </ul>
      </div>

      <div className="text-mono mt-3.5 pt-2 border-t border-border/30 text-[9px] text-muted-foreground/80 leading-relaxed">
        <strong>Security Notice:</strong> Local processing pipelines demand ECDSA signature proofs containing randomized nonces to establish valid sessions. Any hardware variant exposing unmatched signatures or replayed fingerprint configurations is immediately halted before power channel distribution.
      </div>
    </div>
  );
}