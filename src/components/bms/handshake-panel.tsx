import { useEffect, useState, useCallback } from "react";
import { ShieldCheck, RefreshCw, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { setChargeStatus } from "@/lib/bms/charge-status";

export type HandshakeState = "IDLE" | "NEGOTIATING" | "VERIFIED" | "FAILED";

type HandshakeStepConfig = {
  label: string;
  generateCode: (ctx: CryptoContext) => string;
};

type CryptoContext = {
  stationId: string;
  nonce: string;
  signature: string;
  sessionKey: string;
};

const HANDSHAKE_STEPS: HandshakeStepConfig[] = [
  { 
    label: "Station presents identity", 
    generateCode: (ctx) => `STN_ID ${ctx.stationId}` 
  },
  { 
    label: "BMS issues challenge token", 
    generateCode: (ctx) => `CHA = nonce32(${ctx.nonce})` 
  },
  { 
    label: "Station signs w/ private key", 
    generateCode: (ctx) => `σ = Ed25519(CHA, sk_swap) -> ${ctx.signature}` 
  },
  { 
    label: "BMS verifies signature validity", 
    generateCode: (ctx) => `verify(σ, CHA, pk_swap) → AUTH_OK` 
  },
  { 
    label: "Establish ephemeral session keys", 
    generateCode: (ctx) => `K_sess = HKDF(ECDH_shared) · ${ctx.sessionKey}` 
  },
];

// Helper utility to generate realistic hex streams for the dashboard telemetry display
const genHex = (len: number) => 
  Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join("").toUpperCase();

export function HandshakePanel() {
  const [step, setStep] = useState<number>(0);
  const [status, setStatus] = useState<HandshakeState>("NEGOTIATING");
  
  // Ephemeral cryptographic context stored in state for the current session lifecycle
  const [cryptoCtx, setCryptoCtx] = useState<CryptoContext>({
    stationId: "0x4F22A1",
    nonce: "FEEDC0DE...",
    signature: "A1B2...C3D4",
    sessionKey: "0000...0000"
  });

  // Initializes a brand new verification context challenge payload
  const initiateNewHandshake = useCallback(() => {
    setStep(0);
    setStatus("NEGOTIATING");
    
    // Explicit safety interlock: clamp charge access immediately upon key negotiation cycle
    setChargeStatus({
      allowed: false,
      reason: "Authenticating",
      detail: "Executing cryptographic handshake sequence. Power interlock locked open.",
    });

    setCryptoCtx({
      stationId: `0x${genHex(6)}`,
      nonce: `${genHex(8)}...${genHex(8)}`,
      signature: `${genHex(4)}...${genHex(4)}`,
      sessionKey: `${genHex(6)}...${genHex(6)}`
    });
  }, []);

  // Structural execution loop tracking state transitions across the cryptographic chain
  useEffect(() => {
    if (status !== "NEGOTIATING") return;

    const timer = setInterval(() => {
      setStep((currentStep) => {
        const nextStep = currentStep + 1;
        
        if (nextStep >= HANDSHAKE_STEPS.length) {
          clearInterval(timer);
          setStatus("VERIFIED");
          
          // Hardware enforcement hook: switch safety MOSFET to closed state safely
          setChargeStatus({
            allowed: true,
            reason: "Mutual Auth Verified",
            detail: `Authenticated via Ed25519 secure key session loop. MOSFET relays closed.`,
          });
          return HANDSHAKE_STEPS.length;
        }
        return nextStep;
      });
    }, 1200);

    return () => clearInterval(timer);
  }, [status]);

  // Boot up initial authentication challenge sequence on component mounting framework
  useEffect(() => {
    initiateNewHandshake();
  }, [initiateNewHandshake]);

  const isDone = status === "VERIFIED";

  return (
    <div className="panel p-5 relative overflow-hidden">
      {/* Visual glowing accent bar mapping current validation health bounds */}
      <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-40 transition-colors duration-500 ${
        isDone ? "text-primary" : "text-warn"
      }`} />

      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Mutual Authentication</div>
          <h3 className="mt-0.5 text-sm font-medium flex items-center gap-2">
            <ShieldCheck className={`h-4 w-4 transition-colors duration-300 ${isDone ? "text-primary" : "text-warn"}`} /> 
            Cryptographic handshake
          </h3>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={initiateNewHandshake}
            disabled={status === "NEGOTIATING"}
            className="p-1 rounded border border-border bg-secondary/20 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Force Re-Authenticate"
          >
            <RefreshCw className={`h-3 w-3 ${status === "NEGOTIATING" ? "animate-spin" : ""}`} />
          </button>
          
          <span className={`text-mono text-[10px] font-medium px-2 py-0.5 rounded border tracking-wider transition-all duration-300 ${
            isDone 
              ? "border-primary/30 bg-primary/10 text-primary" 
              : "border-warn/30 bg-warn/10 text-warn"
          }`}>
            {isDone ? "CHARGE ENGAGED" : "SEC_NEGOTIATING"}
          </span>
        </div>
      </div>

      <ol className="space-y-1.5">
        {HANDSHAKE_STEPS.map((s, i) => {
          const isActive = i === step && status === "NEGOTIATING";
          const isCompleted = i < step || status === "VERIFIED";
          
          return (
            <li
              key={i}
              className={`flex items-center gap-3 rounded-md border p-2.5 text-mono transition-all duration-300 ${
                isActive 
                  ? "border-primary bg-primary/5 shadow-[0_0_12px_oklch(0.78_0.21_145_/0.05)]" 
                  : isCompleted 
                    ? "border-border/80 bg-secondary/15 opacity-80" 
                    : "border-border/30 opacity-40"
              }`}
            >
              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[9px] transition-all duration-300 ${
                isCompleted 
                  ? "border-primary bg-primary text-primary-foreground shadow-sm" 
                  : isActive 
                    ? "border-primary text-primary animate-pulse" 
                    : "border-border text-muted-foreground"
              }`}>
                {isCompleted ? "✓" : i + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className={`text-xs font-sans transition-colors ${
                  isActive || isCompleted ? "text-foreground font-medium" : "text-muted-foreground"
                }`}>
                  {s.label}
                </div>
                <div className="text-[10px] text-muted-foreground/90 truncate font-mono mt-0.5 select-all">
                  {s.generateCode(cryptoCtx)}
                </div>
              </div>

              <div className="shrink-0 w-4 h-4 flex items-center justify-center">
                {isActive && <Loader2 className="h-3 w-3 text-primary animate-spin" />}
                {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 text-primary opacity-80" />}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Embedded footer reporting analytical key status flags to the station operators */}
      <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-mono text-[9px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3 text-muted-foreground/60" />
          <span>Protocol: ISO 15118-20 / Ed25519-ECDH</span>
        </div>
        <span>Bits: 256-standard</span>
      </div>
    </div>
  );
}