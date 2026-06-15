import { useEffect, useState } from "react";

export const rand = (min: number, max: number) =>
  Math.random() * (max - min) + min;

export const clamp = (v: number, a: number, b: number) =>
  Math.max(a, Math.min(b, v));

export function useTick(ms = 1000) {
  const [, setT] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setT((x) => x + 1), ms);
    return () => clearInterval(i);
  }, [ms]);
}
