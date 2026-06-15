import { useEffect, useState } from "react";
import { AlertTriangle, BatteryCharging, KeyRound } from "lucide-react";
import { setChargeStatus } from "@/lib/bms/charge-status";

type PairedCharger = { id: string; label: string; fingerprint: string; pairedAt: number };

const initialPaired: PairedCharger[] = [
  { id: "CHG-SPIRO-KLA-001", label: "Spiro Swap Station · Kampala HQ", fingerprint: "ed25519:9F2A…11C7", pairedAt: Date.now() - 86400000 * 12 },
  { id: "CHG-SPIRO-NTB-004", label: "Spiro Swap Station · Ntinda",     fingerprint: "ed25519:71B0…44E9", pairedAt: Date.now() - 86400000 * 3 },
];

const candidateChargers = [
  { id: "CHG-SPIRO-KLA-001", label: "Spiro Swap Station · Kampala HQ", fingerprint: "ed25519:9F2A…11C7", trusted: true },
  { id: "CHG-SPIRO-NTB-004", label: "Spiro Swap Station · Ntinda",     fingerprint: "ed25519:71B0…44E9", trusted: true },
  { id: "CHG-UNKNOWN-X19",   label: "Unknown 72V charger",             fingerprint: "ed25519:AA31…0F2D", trusted: false },
  { id: "CHG-CLONE-FAKE",    label: "Cloned Spiro charger (spoofed)",  fingerprint: "ed25519:9F2A…11C7", trusted: false },
];

type AuthState = "idle" | "challenge" | "verify" | "granted" | "denied";

export function ChargerAuthPanel() {
  const [paired, setPaired] = useState<PairedCharger[]>(initialPaired);
  const [attemptIdx, setAttemptIdx] = useState(0);
  const [phase, setPhase] = useState<AuthState>("idle");
  const [pairMode, setPairMode] = useState(false);

  const current = candidateChargers[attemptIdx % candidateChargers.length];
  const isPaired = paired.some((p) => p.id === current.id && p.fingerprint === current.fingerprint);

  useEffect(() => {
    setPhase("challenge");
    const t1 = setTimeout(() => setPhase("verify"), 700);
    const t2 = setTimeout(() => {
      if (pairMode && current.trusted) {
        setPaired((p) =>
          p.some((x) => x.id === current.id)
            ? p
            : [...p, { id: current.id, label: current.label, fingerprint: current.fingerprint, pairedAt: Date.now() }],
        );
        setPhase("granted");
        setPairMode(false);
      } else {
        setPhase(isPaired && current.trusted ? "granted" : "denied");
      }
    }, 1500);
    const t3 = setTimeout(() => setPhase("idle"), 4500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [attemptIdx, pairMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const unpair = (id: string) => setPaired((p) => p.filter((x) => x.id !== id));
  const simulateNext = () => setAttemptIdx((i) => i + 1);

  const phaseMeta = {
    idle:      { color: "text-muted-foreground", label: "IDLE · awaiting charger" },
    challenge: { color: "text-accent",           label: "CHALLENGE · nonce sent" },
    verify:    { color: "text-accent",           label: "VERIFY · checking signature" },
    granted:   { color: "text-primary",          label: "GRANTED · charging enabled" },
    denied:    { color: "text-destructive",      label: "DENIED · charge MOSFET open" },
  }[phase];

  useEffect(() => {
    if (phase === "granted") {
      setChargeStatus({
        allowed: true,
        reason: "Charge enabled",
        detail: `Paired charger ${current.id} authenticated. MOSFET closed.`,
        sourceId: current.id,
      });
    } else if (phase === "denied") {
      const why = !current.trusted
        ? (current.id.includes("CLONE")
            ? "Cloned key — signature replay detected"
            : "Unknown charger — key not in trust store")
        : !isPaired
        ? "Charger not paired with this pack"
        : "Handshake failed";
      setChargeStatus({
        allowed: false,
        reason: "Charge blocked",
        detail: `${why}. Charge MOSFET held open.`,
        sourceId: current.id,
      });
    } else if (phase === "challenge" || phase === "verify") {
      setChargeStatus({
        allowed: false,
        reason: "Verifying charger",
        detail: `Challenge/response in progress with ${current.id}.`,
        sourceId: current.id,
      });
    } else {
      setChargeStatus({
        allowed: false,
        reason: "Awaiting charger",
        detail: "No charge source connected. MOSFET open.",
        sourceId: undefined,
      });
    }
  }, [phase, current.id, current.trusted, isPaired]);

  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Charge Source Authorization</div>
          <h3 className="mt-0.5 text-sm font-medium flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" /> Paired chargers only
          </h3>
        </div>
        <span className={`text-mono text-[10px] px-2 py-1 rounded border border-border ${phaseMeta.color}`}>
          {phaseMeta.label}
        </span>
      </div>

      <div className={`rounded-md border p-3 transition-colors ${
        phase === "granted" ? "border-primary/60 bg-primary/5"
        : phase === "denied" ? "border-destructive/60 bg-destructive/5"
        : "border-border bg-secondary/30"
      }`}>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <BatteryCharging className={`h-4 w-4 ${phase === "denied" ? "text-destructive" : "text-primary"}`} />
            <span className="text-foreground">{current.label}</span>
          </div>
          <span className="text-mono text-[10px] text-muted-foreground">{current.id}</span>
        </div>
        <div className="text-mono mt-2 flex justify-between text-[10px] text-muted-foreground">
          <span>fp {current.fingerprint}</span>
          <span>
            {isPaired ? <span className="text-primary">paired</span> : <span className="text-warn">unpaired</span>}
            {" · "}
            {current.trusted ? "key valid" : <span className="text-destructive">key invalid</span>}
          </span>
        </div>
        {phase === "denied" && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-destructive">
            <AlertTriangle className="h-3 w-3" /> Charge MOSFET held open · pack rejects this source
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={simulateNext}
          className="flex-1 rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-mono text-[11px] text-foreground hover:bg-secondary"
        >
          Simulate next charger
        </button>
        <button
          onClick={() => { setPairMode(true); setAttemptIdx((i) => i + 1); }}
          className="rounded-md border border-primary/60 bg-primary/10 px-3 py-1.5 text-mono text-[11px] text-primary hover:bg-primary/20"
          title="Pair the next connecting charger if its key is valid"
        >
          + Pair next
        </button>
      </div>

      <div className="mt-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          Trusted chargers ({paired.length})
        </div>
        <ul className="space-y-1.5">
          {paired.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-md border border-border bg-secondary/20 px-2.5 py-1.5">
              <div className="min-w-0">
                <div className="text-xs text-foreground truncate">{p.label}</div>
                <div className="text-mono text-[10px] text-muted-foreground truncate">{p.id} · {p.fingerprint}</div>
              </div>
              <button
                onClick={() => unpair(p.id)}
                className="ml-2 rounded border border-border px-2 py-0.5 text-mono text-[10px] text-muted-foreground hover:border-destructive hover:text-destructive"
              >
                revoke
              </button>
            </li>
          ))}
          {paired.length === 0 && (
            <li className="text-mono text-[11px] text-warn">No chargers paired — pack will refuse all charge sources.</li>
          )}
        </ul>
      </div>

      <div className="text-mono mt-3 text-[10px] text-muted-foreground leading-relaxed">
        Enforcement: BMS verifies ECDSA challenge over the charger's pairing key before closing the charge MOSFET. Unknown or cloned keys (replayed fingerprint, wrong signature) are rejected at the hardware layer.
      </div>
    </div>
  );
}
