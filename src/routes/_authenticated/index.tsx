import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Battery,
  BatteryCharging,
  CheckCircle2,
  Cpu,
  Fingerprint,
  Gauge,
  KeyRound,
  LogOut,
  Radio,
  Thermometer,
  Zap,
} from "lucide-react";
import { useTelemetryStream } from "@/hooks/use-telemetry-stream";
import { StatusBar } from "@/components/bms/status-bar";
import { MetricTile } from "@/components/bms/metric-tile";
import { CellMatrix } from "@/components/bms/cell-matrix";
import { TelemetryPanel } from "@/components/bms/telemetry-panel";
import { Sparkline, useSeries } from "@/components/bms/sparkline";
import { HandshakePanel } from "@/components/bms/handshake-panel";
import { ChargerAuthPanel } from "@/components/bms/charger-auth-panel";
import { LockdownPanel } from "@/components/bms/lockdown-panel";
import { EventLog, useLiveEvents, type EventItem } from "@/components/bms/event-log";
import {
  FleetControls,
  FleetDetail,
  FleetMap,
} from "@/components/bms/fleet";
import {
  AnomaliesView,
  GenericView,
  MaintenanceView,
  TABS,
  type Tab,
} from "@/components/bms/views";
import { DbChargersPanel } from "@/components/bms/db-chargers-panel";
import { usePacks, useDbEvents } from "@/hooks/use-bms";
import { useBmsRealtime } from "@/hooks/use-bms-realtime";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Spiro BMS — Battery Management Console" },
      {
        name: "description",
        content:
          "Real-time Battery Management System: live fleet of 600 packs, cell-level telemetry, cryptographic charger auth, lockdown control.",
      },
    ],
  }),
  component: BMS,
});

function BMS() {
  const navigate = useNavigate();
  useBmsRealtime();
  const [paused, setPaused] = useState(false);
  const [showAnomalies, setShowAnomalies] = useState(true);
  const { frame, status } = useTelemetryStream("/api/telemetry/stream", { paused });
  const cells = frame.cells;

  // Fleet from the database (600 seeded packs around Kampala).
  const { assets, isLoading: packsLoading } = usePacks();

  // Persisted event log from DB, plus live derived events from the SSE stream.
  const liveEvents = useLiveEvents(frame);
  const { data: dbEventRows } = useDbEvents();
  const dbEvents: EventItem[] = (dbEventRows ?? []).map((r) => ({
    id: r.id,
    t: new Date(r.ts).toUTCString().slice(17, 25),
    lvl:
      r.severity === "danger"
        ? "danger"
        : r.severity === "warn"
          ? "warn"
          : r.kind === "handshake" || r.kind === "charger_auth"
            ? "ok"
            : "info",
    msg: r.message,
  }));
  const mergedEvents = [...dbEvents, ...liveEvents].slice(0, 40);

  const [tab, setTab] = useState<Tab>("Dashboard");
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [assetQuery, setAssetQuery] = useState("");
  const anomalySeries = useSeries(60, 18, 6);

  const avgV = cells.reduce((a, c) => a + c.v, 0) / cells.length;
  const packV = avgV * 14;
  const avgT = cells.reduce((a, c) => a + c.t, 0) / cells.length;
  const soc = cells.reduce((a, c) => a + c.soc, 0) / cells.length;
  const selected = assets.find((a) => a.id === selectedAsset) ?? null;

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen">
      <StatusBar status={status} frame={frame} paused={paused} />

      <header className="border-b border-border bg-card/40 px-6 py-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded bg-primary text-primary-foreground">
              <Battery className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-medium tracking-tight">Battery Management Console</h1>
              <p className="text-mono text-[11px] text-muted-foreground">
                ASSET → CONTROL → PLATFORM · {packsLoading ? "loading fleet…" : `${assets.length} packs from Lovable Cloud`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-mono text-[10px]">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded px-2.5 py-1 transition-colors cursor-pointer ${
                  tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
            <button
              onClick={handleSignOut}
              className="ml-2 inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 text-muted-foreground hover:text-destructive hover:border-destructive"
              title="Sign out"
            >
              <LogOut className="h-3 w-3" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="space-y-4 p-6">
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
          <MetricTile label="State of Charge" value={soc.toFixed(1)} unit="%" icon={BatteryCharging} sub="SoH 96.4% · cycles 412" />
          <MetricTile label="Pack Voltage" value={packV.toFixed(2)} unit="V" icon={Zap} sub={`avg cell ${avgV.toFixed(3)}V`} accent="info" />
          <MetricTile label="Pack Current" value={frame.current.toFixed(2)} unit="A" icon={Activity} sub="discharge" />
          <MetricTile label="Avg Temp" value={avgT.toFixed(1)} unit="°C" icon={Thermometer} sub="coolant nominal" accent="warn" />
          <MetricTile label="Pack Health" value="96.4" unit="%" icon={Gauge} sub="SoH model v3" accent="info" />
          <MetricTile label="Risk Score" value={frame.riskScore.toFixed(3)} icon={Cpu} sub="LOW · last 5min" />
        </section>

        {tab === "Dashboard" && (
          <section className="grid grid-cols-12 gap-4">
            <div className="col-span-12 xl:col-span-8 space-y-4">
              <CellMatrix cells={cells} />
              <TelemetryPanel frame={frame} />
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <FleetMap assets={assets} selectedId={selectedAsset} onSelect={setSelectedAsset} showAnomalies={showAnomalies} />
                <EventLog events={mergedEvents} />
              </div>
            </div>

            <aside className="col-span-12 xl:col-span-4 space-y-4">
              <div className="panel p-5">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Secure Enclave</div>
                <h3 className="mt-0.5 text-sm font-medium flex items-center gap-2">
                  <Fingerprint className="h-4 w-4 text-primary" /> Pack identity
                </h3>
                <dl className="text-mono mt-4 space-y-2 text-xs">
                  <div className="flex justify-between"><dt className="text-muted-foreground">Serial</dt><dd>{frame.packId}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Chemistry</dt><dd>LFP 14S4P · 51.2V · 30Ah</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Public key</dt><dd className="truncate max-w-[160px]">ed25519:Z9k…7Qw</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Attestation</dt><dd className="text-primary flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> verified</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Rider</dt><dd>RDR-08812 · Mukasa J.</dd></div>
                </dl>
              </div>

              <HandshakePanel />
              <ChargerAuthPanel />
              <DbChargersPanel />
              <LockdownPanel />

              <div className="panel p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Anomaly Detector</div>
                    <h3 className="mt-0.5 text-sm font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warn" /> AI/ML signal
                    </h3>
                  </div>
                  <span className="text-mono text-[10px] text-muted-foreground">v3 · ensemble</span>
                </div>
                <div className="mt-3 h-20"><Sparkline data={anomalySeries} color="oklch(0.8 0.18 75)" /></div>
                <div className="text-mono mt-2 flex justify-between text-[11px] text-muted-foreground">
                  <span>residual 0.18σ</span>
                  <span className="text-primary">within bounds</span>
                </div>
              </div>

              <div className="panel p-5 border-primary/40">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/15 text-primary">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">Cryptographic handshake successful</div>
                    <div className="text-mono mt-0.5 text-[11px] text-muted-foreground">
                      STN-KLA-019 ↔ BMS-00284 · session 0xA4F9 · 256-bit
                    </div>
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded border border-primary px-2 py-0.5 text-[10px] text-primary text-mono">
                      <Radio className="h-3 w-3" /> CHARGE ENABLED
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </section>
        )}

        {tab === "Live Fleet" && (
          <section className="grid grid-cols-12 gap-4">
            <div className="col-span-12 xl:col-span-8 space-y-4">
              <div className="panel p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Fleet Controls</div>
                  <h3 className="mt-0.5 text-sm font-medium">
                    Stream & overlay settings · {assets.length} assets live from DB
                  </h3>
                </div>
                <FleetControls
                  paused={paused}
                  onTogglePause={() => setPaused((p) => !p)}
                  showAnomalies={showAnomalies}
                  onToggleAnomalies={() => setShowAnomalies((s) => !s)}
                  status={status}
                />
              </div>
              <FleetMap
                assets={assets}
                selectedId={selectedAsset}
                onSelect={setSelectedAsset}
                height="h-[520px]"
                showAnomalies={showAnomalies}
              />
            </div>
            <aside className="col-span-12 xl:col-span-4 space-y-4">
              <FleetDetail asset={selected} />
              <div className="panel p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Asset Roster</div>
                  <span className="text-mono text-[10px] text-muted-foreground">
                    {assets.filter((a) => a.id.toLowerCase().includes(assetQuery.trim().toLowerCase())).length}/{assets.length}
                  </span>
                </div>
                <input
                  type="text"
                  value={assetQuery}
                  onChange={(e) => setAssetQuery(e.target.value)}
                  placeholder="Filter by battery number (e.g. 00291)"
                  className="mb-3 w-full rounded border border-border bg-background px-2 py-1.5 text-mono text-xs outline-none focus:border-primary"
                />
                <ul className="text-mono text-xs space-y-1 max-h-[380px] overflow-y-auto pr-1">
                  {assets
                    .filter((a) => a.id.toLowerCase().includes(assetQuery.trim().toLowerCase()))
                    .slice(0, 200)
                    .map((a) => (
                      <li key={a.id}>
                        <button
                          onClick={() => setSelectedAsset(a.id)}
                          className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left transition-colors cursor-pointer ${
                            selectedAsset === a.id ? "bg-primary/15 text-primary" : "hover:bg-secondary/50"
                          }`}
                        >
                          <span>{a.id}</span>
                          <span className={
                            a.risk === "danger" ? "text-destructive"
                            : a.risk === "warn" ? "text-warn"
                            : "text-muted-foreground"
                          }>{a.soc.toFixed(0)}%</span>
                        </button>
                      </li>
                    ))}
                  {assets.filter((a) => a.id.toLowerCase().includes(assetQuery.trim().toLowerCase())).length === 0 && (
                    <li className="px-2 py-3 text-muted-foreground">No assets match "{assetQuery}".</li>
                  )}
                </ul>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Showing first 200 matches. Refine the filter to find a specific pack.
                </p>
              </div>
            </aside>
          </section>
        )}

        {tab === "Anomalies" && <AnomaliesView frame={frame} events={mergedEvents} />}
        {tab === "Maintenance" && <MaintenanceView assets={assets} />}
        {tab === "Repayments" && (
          <GenericView title="Credtrack Repayments"
            lines={[
              "1,247 active financed packs · 96.2% on-time rate",
              "Auto-lockdown triggers after 7 missed days (configurable)",
              "Today's settlements: 312 packs · UGX 4.1M processed",
              "Next batch reconcile at 18:00 UTC",
            ]} />
        )}
        {tab === "Routing" && (
          <GenericView title="Swap-station Routing"
            lines={[
              "82 stations online in Kampala metro",
              "Avg swap time 47s · queue depth 1.4 packs",
              "ML predicts demand peak 17:30–19:00",
              "Reroute 6 riders away from STN-KLA-019 (load 92%)",
            ]} />
        )}
        {tab === "Security" && (
          <GenericView title="Security & Attestation"
            lines={[
              "Ed25519 enclave keys rotated daily",
              "TLS 1.3 over MQTT · cert pinning enabled",
              "0 anomalous handshake attempts in last 24h",
              "Last firmware signature verified: 0x7A11C · SHA256 OK",
            ]} />
        )}
        {tab === "Settings" && (
          <GenericView title="Console Settings"
            lines={[
              "Telemetry cadence: 800ms (SSE)",
              "Lockdown requires dual-operator confirm",
              "Theme: Spiro Dark (default)",
              "Operator: control@spiro.io · role: fleet-admin",
            ]} />
        )}

        <footer className="text-mono pt-2 text-center text-[10px] text-muted-foreground">
          SPIRO IoT Platform · Enterprise Hub · all telemetry TLS 1.3 over MQTT/4G
        </footer>
      </main>
    </div>
  );
}
