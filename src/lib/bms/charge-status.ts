import { useEffect, useState } from "react";

export type ChargeStatus = {
  allowed: boolean;
  reason: string;
  detail?: string;
  sourceId?: string;
  updatedAt: number;
};

const listeners = new Set<(s: ChargeStatus) => void>();
let state: ChargeStatus = {
  allowed: false,
  reason: "Awaiting charger",
  detail: "No charge source connected. MOSFET open.",
  updatedAt: Date.now(),
};

export function setChargeStatus(next: Partial<ChargeStatus>) {
  state = { ...state, ...next, updatedAt: Date.now() };
  listeners.forEach((fn) => fn(state));
}

export function useChargeStatus(): ChargeStatus {
  const [s, setS] = useState<ChargeStatus>(state);
  useEffect(() => {
    const fn = (next: ChargeStatus) => setS(next);
    listeners.add(fn);
    setS(state);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return s;
}
