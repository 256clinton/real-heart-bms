import { ShieldCheck, KeyRound, Loader2 } from "lucide-react";
import { useChargers, useToggleCharger } from "@/hooks/use-bms";

export function DbChargersPanel() {
  const { data, isLoading } = useChargers();
  const toggle = useToggleCharger();
  const chargers = data ?? [];
  const enabled = chargers.filter((c) => c.enabled).length;

  return (
    <div className="panel p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Authorized Chargers (Database)
          </div>
          <h3 className="mt-0.5 text-sm font-medium flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" /> Trust store · {enabled}/{chargers.length} enabled
          </h3>
        </div>
        <ShieldCheck className="h-4 w-4 text-primary" />
      </div>

      {isLoading ? (
        <div className="text-mono text-[11px] text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" /> loading whitelist…
        </div>
      ) : (
        <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {chargers.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded border border-border bg-secondary/20 px-2.5 py-1.5 text-mono text-[11px]"
            >
              <div className="min-w-0 pr-2">
                <div className="text-xs text-foreground truncate">{c.label ?? c.id}</div>
                <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {c.id} · {c.pubkey.slice(0, 22)}…
                </div>
              </div>
              <button
                onClick={() => toggle.mutate({ id: c.id, enabled: !c.enabled })}
                disabled={toggle.isPending}
                className={`shrink-0 rounded border px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] cursor-pointer transition-colors ${
                  c.enabled
                    ? "border-primary/50 text-primary hover:bg-primary/10"
                    : "border-destructive/50 text-destructive hover:bg-destructive/10"
                }`}
              >
                {c.enabled ? "enabled" : "disabled"}
              </button>
            </li>
          ))}
          {chargers.length === 0 && (
            <li className="text-mono text-[11px] text-muted-foreground">
              No chargers in trust store.
            </li>
          )}
        </ul>
      )}
      <p className="mt-3 text-[10px] text-muted-foreground">
        Toggles persist in Lovable Cloud. Only <code>fleet_admin</code> /{" "}
        <code>admin</code> can change state (RLS enforced).
      </p>
    </div>
  );
}
