import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

const HANDSHAKE_STEPS = [
  { label: "Station presents identity", code: "STN_ID 0x4F22A1" },
  { label: "BMS issues challenge", code: "CHA = nonce(32)" },
  { label: "Station signs w/ private key", code: "σ = Ed25519(CHA, sk)" },
  { label: "BMS verifies signature", code: "verify(σ, CHA, pk) → OK" },
  { label: "Session key established", code: "K = HKDF(ECDH) · 256b" },
];

export function HandshakePanel() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setStep((s) => (s + 1) % (HANDSHAKE_STEPS.length + 2)), 1500);
    return () => clearInterval(i);
  }, []);
  const done = step >= HANDSHAKE_STEPS.length;
  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Mutual Authentication</div>
          <h3 className="mt-0.5 text-sm font-medium flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Cryptographic handshake
          </h3>
        </div>
        <span className={`text-mono text-[10px] px-2 py-1 rounded border ${done ? "border-primary text-primary" : "border-warn text-warn"}`}>
          {done ? "CHARGE ENABLED" : "NEGOTIATING"}
        </span>
      </div>

      <ol className="space-y-2">
        {HANDSHAKE_STEPS.map((s, i) => {
          const active = i === step;
          const completed = i < step;
          return (
            <li
              key={i}
              className={`flex items-center gap-3 rounded-md border px-3 py-2 transition-all ${
                active ? "border-primary bg-primary/5" : completed ? "border-border bg-secondary/30" : "border-border/60"
              }`}
            >
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] text-mono ${
                  completed ? "border-primary bg-primary text-primary-foreground" : active ? "border-primary text-primary" : "border-border text-muted-foreground"
                }`}
              >
                {completed ? "✓" : i + 1}
              </div>
              <div className="flex-1">
                <div className={`text-xs ${active || completed ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</div>
                <div className="text-mono text-[10px] text-muted-foreground">{s.code}</div>
              </div>
              {active && <div className="h-1.5 w-1.5 rounded-full bg-primary pulse-dot" />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
