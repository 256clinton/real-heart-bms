import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useMemo } from "react";
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
  Radio,
  Thermometer,
  Zap,
  RefreshCw,
  Sliders,
  ShieldAlert,
  ShieldCheck,
  Lock,
  UserCheck,
  MapPin,
  Compass,
  Wrench,
  Clock,
  Search,
  Check,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  History,
  TrendingUp
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
import { EventLog, useLiveEvents } from "@/components/bms/event-log";
import {
  FleetControls,
  FleetDetail,
  FleetMap,
  useFleet,
} from "@/components/bms/fleet";
import {
  AnomaliesView,
  GenericView,
  MaintenanceView,
  TABS,
  type Tab,
} from "@/components/bms/views";

// Declare type-safe search parameters for modern TanStack Routing deep linking
type BmsSearchQuery = {
  tab?: Tab;
};

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): BmsSearchQuery => {
    return {
      tab: (search.tab as Tab) || "Dashboard",
    };
  },
  head: () => ({
    meta: [
      { title: "Spiro BMS — Battery Management Console" },
      {
        name: "description",
        content:
          "Real-time Battery Management System: cell-level telemetry, cryptographic swap authentication, fleet anomaly detection, and lockdown control.",
      },
      { property: "og:title", content: "Spiro BMS — Battery Management Console" },
      {
        property: "og:description",
        content:
          "Real-time Battery Management System: cell-level telemetry, cryptographic swap authentication, fleet anomaly detection, and lockdown control.",
      },
    ],
  }),
  component: BMS,
});

function BMS() {
  // Deep-linking routing integration replacing local tab state
  const { tab = "Dashboard" } = useSearch({ from: "/" });
  const navigate = useNavigate({ from: "/" });

  const setTab = (newTab: Tab) => {
    navigate({ search: (prev) => ({ ...prev, tab: newTab }) });
  };

  // State management primitives
  const [paused, setPaused] = useState(false);
  const [showAnomalies, setShowAnomalies] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [assetQuery, setAssetQuery] = useState("");
  const [otaCommandConfirm, setOtaCommandConfirm] = useState<string | null>(null);

  // Advanced feature sub-states for upgraded security, settings, and routing panels
  const [keyRotating, setKeyRotating] = useState(false);
  const [settingsCadence, setSettingsCadence] = useState(800);
  const [dualOperatorMode, setDualOperatorMode] = useState(true);
  const [operatorRole, setOperatorRole] = useState("fleet-admin");
  const [stationRouteQuery, setStationRouteQuery] = useState("");

  // Upgraded Feature Sub-States (Anomalies & Maintenance)
  const [anomalyFilter, setAnomalyFilter] = useState<"ALL" | "CRITICAL" | "THERMAL" | "VOLTAGE">("ALL");
  const [maintenanceFilter, setMaintenanceFilter] = useState<"ALL" | "SCHEDULED" | "OVERDUE" | "OPTIMAL">("ALL");
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);

  // Live telemetry streaming pipelines
  const { frame, status } = useTelemetryStream("/api/telemetry/stream", { paused });
  const cells = frame.cells;
  const assets = useFleet(38, paused);
  const events = useLiveEvents(frame);
  const anomalySeries = useSeries(60, 18, 6);

  // Compute metrics with useMemo to optimize deep redraw boundaries
  const derivedMetrics = useMemo(() => {
    if (!cells || cells.length === 0) {
      return { avgV: 0, packV: 0, avgT: 0, soc: 0, deltaT: 0, criticalCells: [] };
    }
    const totalCells = cells.length;
    const sumV = cells.reduce((acc, c) => acc + c.v, 0);
    const sumT = cells.reduce((acc, c) => acc + c.t, 0);
    const sumSoc = cells.reduce((acc, c) => acc + c.soc, 0);

    const avgV = sumV / totalCells;
    const avgT = sumT / totalCells;
    const soc = sumSoc / totalCells;

    const temps = cells.map((c) => c.t);
    const maxT = Math.max(...temps);
    const minT = Math.min(...temps);
    const deltaT = maxT - minT;

    const criticalCells = cells
      .map((c, idx) => ({ id: idx + 1, t: c.t }))
      .filter((c) => c.t > avgT + 3.5);

    return { avgV, packV: avgV * 14, avgT, soc, deltaT, criticalCells };
  }, [cells]);

  const selectedAssetData = useMemo(() => {
    return assets.find((a) => a.id === selectedAsset) ?? null;
  }, [assets, selectedAsset]);

  const filteredAssets = useMemo(() => {
    const query = assetQuery.trim().toLowerCase();
    if (!query) return assets;
    return assets.filter((a) => a.id.toLowerCase().includes(query));
  }, [assets, assetQuery]);

  // Mock static list of swap stations for upgraded routing view
  const swapStations = useMemo(() => {
    const data = [
      { id: "STN-KLA-019", name: "Kampala Central - HQ", load: 92, queue: 6, status: "Critical Load" },
      { id: "STN-NTB-004", name: "Ntinda Hub", load: 45, queue: 1, status: "Optimal" },
      { id: "STN-KWA-002", name: "Kiwenda Station", load: 18, queue: 0, status: "Optimal" },
      { id: "STN-KLA-082", name: "Wandegeya Pass", load: 74, queue: 3, status: "High Depth" },
      { id: "STN-MAK-011", name: "Makindye Bypass", load: 31, queue: 0, status: "Optimal" },
    ];
    if (!stationRouteQuery) return data;
    return data.filter(st => st.name.toLowerCase().includes(stationRouteQuery.toLowerCase()) || st.id.toLowerCase().includes(stationRouteQuery.toLowerCase()));
  }, [stationRouteQuery]);

  // Upgraded Mock Data Layer for Inline View Fallbacks
  const computedAnomaliesList = useMemo(() => {
    return [
      { id: "ANM-291", packId: "SPRO-LFP-00291", type: "THERMAL", severity: "CRITICAL", msg: "Cell #8 thermal gradient delta exceeded > 4.8°C envelope", time: "14:12:05", metric: "51.4°C" },
      { id: "ANM-842", packId: "SPRO-LFP-01842", type: "VOLTAGE", severity: "WARN", msg: "Micro-short circuit signature suspected during rapid discharge", time: "14:09:32", metric: "Δ240mV" },
      { id: "ANM-054", packId: "SPRO-LFP-00054", type: "CRITICAL", severity: "CRITICAL", msg: "Cryptographic attestation handshake timeout - unauthorized swap attempt", time: "13:58:11", metric: "AUTH_FAIL" },
      { id: "ANM-771", packId: "SPRO-LFP-02771", type: "VOLTAGE", severity: "WARN", msg: "Cell impedance imbalance detected at 14S configuration array", time: "13:44:19", metric: "18.2 mΩ" },
    ].filter(a => {
      if (anomalyFilter === "ALL") return true;
      return a.type === anomalyFilter || a.severity === anomalyFilter;
    });
  }, [anomalyFilter]);

  const computedMaintenanceTickets = useMemo(() => {
    return [
      { id: "MNT-902", packId: "SPRO-LFP-00104", status: "OVERDUE", type: "Cell Balancing", cycles: 612, health: "89.1%", tech: "N. Kakooza", due: "3 days ago" },
      { id: "MNT-411", packId: "SPRO-LFP-01394", status: "SCHEDULED", type: "Enclave Key Refresh", cycles: 402, health: "94.5%", tech: "A. Okello", due: "Today, 17:00" },
      { id: "MNT-702", packId: "SPRO-LFP-00821", status: "OPTIMAL", type: "Structural Inspection", cycles: 180, health: "98.2%", tech: "S. Mubiru", due: "In 12 days" },
      { id: "MNT-119", packId: "SPRO-LFP-02293", status: "SCHEDULED", type: "BMS Hardware Recalibration", cycles: 520, health: "91.0%", tech: "N. Kakooza", due: "Tomorrow" },
    ].filter(t => {
      if (maintenanceFilter === "ALL") return true;
      return t.status === maintenanceFilter;
    });
  }, [maintenanceFilter]);

  const executeOtaOverride = (commandType: string) => {
    setOtaCommandConfirm(null);
    console.warn(`[OTA AUTHENTICATED] Dispatched command block: ${commandType} to ${frame.packId}`);
  };

  const handleForceKeyRotation = () => {
    setKeyRotating(true);
    setTimeout(() => setKeyRotating(false), 1200);
  };

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
                ASSET → CONTROL → PLATFORM · cell-to-cloud telemetry pipeline
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-mono text-[10px]">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded px-2.5 py-1 transition-colors cursor-pointer ${
                  tab === t
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="space-y-4 p-6">
        {/* Core Pack Performance Telemetry Metrics Matrix */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
          <MetricTile label="State of Charge" value={derivedMetrics.soc.toFixed(1)} unit="%" icon={BatteryCharging} sub="SoH 96.4% · cycles 412" />
          <MetricTile label="Pack Voltage" value={derivedMetrics.packV.toFixed(2)} unit="V" icon={Zap} sub={`avg cell ${derivedMetrics.avgV.toFixed(3)}V`} accent="info" />
          <MetricTile label="Pack Current" value={frame.current.toFixed(2)} unit="A" icon={Activity} sub="discharge" />
          <MetricTile label="Avg Temp" value={derivedMetrics.avgT.toFixed(1)} unit="°C" icon={Thermometer} sub={`Thermal Delta: ${derivedMetrics.deltaT.toFixed(1)}°C`} accent={derivedMetrics.deltaT > 4.5 ? "warn" : "primary"} />
          <MetricTile label="Pack Health" value="96.4" unit="%" icon={Gauge} sub="SoH model v3" accent="info" />
          <MetricTile label="Risk Score" value={frame.riskScore.toFixed(3)} icon={Cpu} sub={frame.riskScore > 0.15 ? "EVALUATE · anomaly detected" : "LOW · last 5min"} accent={frame.riskScore > 0.15 ? "warn" : "primary"} />
        </section>

        {tab === "Dashboard" && (
          <section className="grid grid-cols-12 gap-4">
            <div className="col-span-12 xl:col-span-8 space-y-4">
              <CellMatrix cells={cells} />
              <TelemetryPanel frame={frame} />
              
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <FleetMap assets={assets} selectedId={selectedAsset} onSelect={setSelectedAsset} showAnomalies={showAnomalies} />
                <EventLog events={events} />
              </div>
            </div>

            <aside className="col-span-12 xl:col-span-4 space-y-4">
              {derivedMetrics.criticalCells.length > 0 && (
                <div className="panel p-4 border-warn/60 bg-warn/5 animate-pulse">
                  <div className="flex items-center gap-2 text-warn text-xs font-semibold uppercase tracking-wider">
                    <ShieldAlert className="h-4 w-4" /> Thermal Gradient Delta Alert
                  </div>
                  <p className="text-muted-foreground text-[11px] mt-1">
                    The following hardware cells have spiked above the structural mean threshold envelope:
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-mono text-[10px]">
                    {derivedMetrics.criticalCells.map((cell) => (
                      <span key={cell.id} className="bg-warn/20 border border-warn/40 text-warn rounded px-1.5 py-0.5">
                        Cell #{cell.id}: {cell.t.toFixed(1)}°C
                      </span>
                    ))}
                  </div>
                </div>
              )}

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
              <LockdownPanel />

              <div className="panel p-5 border-destructive/20 bg-destructive/5">
                <div className="text-[10px] uppercase tracking-[0.18em] text-destructive/80 font-medium">BMS Enclave Sync</div>
                <h3 className="mt-0.5 text-sm font-medium flex items-center gap-2 text-foreground">
                  <Sliders className="h-4 w-4 text-destructive" /> Emergency OTA Control
                </h3>
                
                {otaCommandConfirm ? (
                  <div className="mt-3 rounded border border-destructive/40 bg-background p-3 text-center">
                    <p className="text-mono text-[11px] text-foreground">Execute emergency structural "{otaCommandConfirm}" override?</p>
                    <div className="mt-2 flex justify-center gap-2 text-mono text-[10px]">
                      <button onClick={() => executeOtaOverride(otaCommandConfirm)} className="rounded bg-destructive text-destructive-foreground px-2 py-1 font-semibold hover:bg-destructive/90">
                        Confirm Action
                      </button>
                      <button onClick={() => setOtaCommandConfirm(null)} className="rounded border border-border px-2 py-1 hover:bg-secondary">
                        Abort
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-mono text-[10px]">
                    <button onClick={() => setOtaCommandConfirm("CELL_BALANCING_FORCE")} className="flex items-center justify-center gap-1.5 rounded border border-border bg-background py-2 hover:border-primary transition-colors">
                      <RefreshCw className="h-3 w-3" /> Force Balance
                    </button>
                    <button onClick={() => setOtaCommandConfirm("REVOKE_CHARGER_TRUST")} className="flex items-center justify-center gap-1.5 rounded border border-border bg-background py-2 hover:border-destructive text-destructive transition-colors">
                      <KeyRound className="h-3 w-3" /> Clear Trust
                    </button>
                  </div>
                )}
              </div>

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
            </aside>
          </section>
        )}

        {/* HIGH LEVEL UPGRADE: Live Fleet Panel */}
        {tab === "Live Fleet" && (
          <section className="grid grid-cols-12 gap-4">
            <div className="col-span-12 xl:col-span-8 space-y-4">
              <div className="panel p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Fleet Infrastructure Overview</div>
                  <h3 className="mt-0.5 text-base font-semibold flex items-center gap-2">
                    <Radio className="h-4 w-4 text-primary animate-pulse" /> Live Telemetry Streaming Array
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

              {/* Enhanced Grid Matrix Metrics for Fleet Status */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-mono">
                <div className="p-3 rounded border border-border bg-card/60">
                  <div className="text-[10px] text-muted-foreground uppercase">Total Monitored</div>
                  <div className="text-lg font-bold mt-1 text-foreground">{assets.length} Packs</div>
                </div>
                <div className="p-3 rounded border border-border bg-card/60">
                  <div className="text-[10px] text-primary uppercase">Active Transmitting</div>
                  <div className="text-lg font-bold mt-1 text-primary">{assets.filter(a => a.soc > 20).length} Nodes</div>
                </div>
                <div className="p-3 rounded border border-border bg-card/60">
                  <div className="text-[10px] text-warn uppercase">Critical Anomalies</div>
                  <div className="text-lg font-bold mt-1 text-warn">{assets.filter(a => a.risk === "danger" || a.risk === "warn").length} Units</div>
                </div>
                <div className="p-3 rounded border border-border bg-card/60">
                  <div className="text-[10px] text-muted-foreground uppercase">Pipeline Load</div>
                  <div className="text-lg font-bold mt-1 text-foreground">{(settingsCadence / 10).toFixed(0)} msg/s</div>
                </div>
              </div>

              <FleetMap
                assets={assets}
                selectedId={selectedAsset}
                onSelect={setSelectedAsset}
                height="h-[560px]"
                showAnomalies={showAnomalies}
              />
            </div>

            <aside className="col-span-12 xl:col-span-4 space-y-4">
              <FleetDetail asset={selectedAssetData} />
              
              <div className="panel p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Asset Roster</div>
                  <span className="text-mono text-[10px] text-muted-foreground">
                    {filteredAssets.length}/{assets.length} Nodes
                  </span>
                </div>
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={assetQuery}
                    onChange={(e) => setAssetQuery(e.target.value)}
                    placeholder="Search serial or battery number..."
                    className="w-full rounded border border-border bg-background pl-8 pr-3 py-1.5 text-mono text-xs outline-none focus:border-primary"
                  />
                </div>
                <ul className="text-mono text-xs space-y-1 max-h-[380px] overflow-y-auto pr-1">
                  {filteredAssets.map((a) => (
                    <li key={a.id}>
                      <button
                        onClick={() => setSelectedAsset(a.id)}
                        className={`flex w-full items-center justify-between rounded px-2.5 py-2 text-left transition-colors cursor-pointer ${
                          selectedAsset === a.id ? "bg-primary/15 text-primary border border-primary/20" : "hover:bg-secondary/50 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`h-1.5 w-1.5 rounded-full ${a.risk === "danger" ? "bg-destructive" : a.risk === "warn" ? "bg-warn" : "bg-primary"}`} />
                          <span className="font-medium">{a.id}</span>
                        </div>
                        <span className={
                          a.risk === "danger" ? "text-destructive font-medium"
                          : a.risk === "warn" ? "text-warn"
                          : "text-muted-foreground"
                        }>{a.soc.toFixed(0)}%</span>
                      </button>
                    </li>
                  ))}
                  {filteredAssets.length === 0 && (
                    <li className="px-2 py-3 text-muted-foreground text-center">No assets match "{assetQuery}".</li>
                  )}
                </ul>
              </div>
            </aside>
          </section>
        )}

        {/* HIGH LEVEL UPGRADE: Anomalies Panel View */}
        {tab === "Anomalies" && (
          <section className="space-y-4">
            <div className="panel p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">ML Core Diagnostic Array</div>
                <h3 className="mt-0.5 text-base font-semibold flex items-center gap-2 text-foreground">
                  <AlertTriangle className="h-4 w-4 text-warn" /> AI/ML Signal Processing & Anomaly Isolation
                </h3>
              </div>
              
              <div className="flex gap-1 text-mono text-[10px]">
                {(["ALL", "CRITICAL", "THERMAL", "VOLTAGE"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setAnomalyFilter(filter)}
                    className={`px-3 py-1.5 border rounded cursor-pointer transition-all ${
                      anomalyFilter === filter 
                        ? "bg-warn/10 text-warn border-warn/40 font-medium" 
                        : "border-border text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4">
              {/* Main Anomalies Listing */}
              <div className="col-span-12 xl:col-span-8 panel p-5 space-y-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase text-mono tracking-wider">
                  Active System Flags ({computedAnomaliesList.length})
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-mono text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border/60 text-muted-foreground text-[11px]">
                        <th className="pb-2">Incident ID</th>
                        <th className="pb-2">Hardware Pack Key</th>
                        <th className="pb-2">Classification</th>
                        <th className="pb-2">Telemetry Context Metric</th>
                        <th className="pb-2 text-right">Trigger Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {computedAnomaliesList.map((anm) => (
                        <tr key={anm.id} className="border-b border-border/30 hover:bg-secondary/10 group">
                          <td className="py-3 font-semibold text-foreground text-xs">{anm.id}</td>
                          <td className="py-3 text-muted-foreground font-medium">{anm.packId}</td>
                          <td className="py-3">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                              anm.severity === "CRITICAL" ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-warn/10 text-warn border border-warn/20"
                            }`}>
                              {anm.type}
                            </span>
                          </td>
                          <td className="py-3 text-foreground/90 max-w-xs truncate" title={anm.msg}>{anm.msg}</td>
                          <td className="py-3 text-right text-muted-foreground flex items-center justify-end gap-2">
                            <span>{anm.time}</span>
                            <span className="text-[11px] font-bold text-foreground bg-secondary/60 px-1.5 py-0.5 rounded">{anm.metric}</span>
                          </td>
                        </tr>
                      ))}
                      {computedAnomaliesList.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-muted-foreground">No telemetry flags mapped under filtering rules.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sidebar AI Diagnostic Insights */}
              <aside className="col-span-12 xl:col-span-4 space-y-4">
                <div className="panel p-5 bg-card/40 space-y-4">
                  <h4 className="text-xs font-semibold uppercase text-foreground tracking-wider flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" /> Predictive Trend Analysis
                  </h4>
                  <div className="h-16"><Sparkline data={anomalySeries} color="oklch(0.65 0.24 350)" /></div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed text-mono">
                    Ensemble v3 structural pipeline computes an aggregate risk gradient deviation across Kampala Corridors. Moving residual calculation stands at <span className="text-warn font-semibold">0.18σ</span>.
                  </p>
                  <div className="pt-2 border-t border-border/60 space-y-2 text-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Thermal Throttles Dispatched</span>
                      <span className="text-foreground font-semibold">2 Packs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Isolation Vector Confidence</span>
                      <span className="text-primary font-semibold">99.4%</span>
                    </div>
                  </div>
                </div>

                <div className="panel p-5 border-destructive/20 bg-destructive/5 space-y-2">
                  <div className="text-[10px] uppercase font-bold text-destructive tracking-widest">Enforcement Directives</div>
                  <h4 className="text-xs font-medium text-foreground">Automated Swapping Isolation</h4>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    Packs displaying critical short signature matrix rules are barred from completing charging handshake cycles automatically at smart dock panels.
                  </p>
                </div>
              </aside>
            </div>
          </section>
        )}

        {/* HIGH LEVEL UPGRADE: Maintenance & Overhauls Panel */}
        {tab === "Maintenance" && (
          <section className="space-y-4">
            <div className="panel p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Hardware Optimization Ledger</div>
                <h3 className="mt-0.5 text-base font-semibold flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-primary" /> System Recalibration & Operational Tickets
                </h3>
              </div>
              
              <div className="flex gap-1 text-mono text-[10px]">
                {(["ALL", "OVERDUE", "SCHEDULED", "OPTIMAL"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setMaintenanceFilter(filter)}
                    className={`px-3 py-1.5 border rounded cursor-pointer transition-all ${
                      maintenanceFilter === filter 
                        ? "bg-primary/10 text-primary border-primary/40 font-medium" 
                        : "border-border text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4">
              {/* Asset Performance Health & Maintenance Log */}
              <div className="col-span-12 xl:col-span-8 panel p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-muted-foreground uppercase text-mono tracking-wider">
                    Assigned Task Invariants ({computedMaintenanceTickets.length})
                  </div>
                  <button className="flex items-center gap-1.5 rounded border border-border px-2.5 py-1 text-mono text-[11px] hover:bg-secondary">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Export Manifest
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {computedMaintenanceTickets.map((t) => (
                    <div 
                      key={t.id} 
                      onClick={() => setSelectedTicket(selectedTicket === t.id ? null : t.id)}
                      className={`p-3 rounded border text-mono text-xs cursor-pointer transition-all flex flex-wrap items-center justify-between gap-4 ${
                        selectedTicket === t.id 
                          ? "bg-primary/5 border-primary/40" 
                          : "bg-card/40 border-border/80 hover:border-border"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{t.id}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground font-medium">{t.packId}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                            t.status === "OVERDUE" ? "bg-destructive/10 text-destructive" : t.status === "SCHEDULED" ? "bg-warn/10 text-warn" : "bg-primary/10 text-primary"
                          }`}>{t.status}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                          <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {t.type}</span>
                          <span>•</span>
                          <span>Health: {t.health}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-right">
                        <div className="text-mono">
                          <div className="text-[11px] font-medium text-foreground">{t.tech}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end mt-0.5">
                            <Clock className="h-3 w-3" /> {t.due}
                          </div>
                        </div>
                        <div className="h-6 w-6 rounded-full border border-border/80 flex items-center justify-center hover:bg-secondary/80">
                          <Check className={`h-3 w-3 text-primary ${selectedTicket === t.id ? "opacity-100" : "opacity-30"}`} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Maintenance Statistics Panel */}
              <aside className="col-span-12 xl:col-span-4 space-y-4">
                <div className="panel p-5 space-y-4">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                    Infrastructure Wear Assessment
                  </h4>
                  <div className="space-y-3 text-mono text-xs">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-muted-foreground">Avg Cell Degradation Factor</span>
                        <span className="text-foreground font-bold">3.6%</span>
                      </div>
                      <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full w-[3.6%]" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-muted-foreground">SOH Calibration Boundary</span>
                        <span className="text-warn font-bold">88% Threshold</span>
                      </div>
                      <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                        <div className="bg-warn h-full w-[88%]" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="panel p-4 bg-secondary/20 border-border/80 text-mono text-xs space-y-2">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-foreground">
                    <History className="h-4 w-4 text-primary" /> Recalibration Note
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    Packs crossing the <span className="text-foreground">500 cycle mark</span> require automated load balancing sweeps to eliminate parasitic impedance variance within parallel cell strings.
                  </p>
                </div>
              </aside>
            </div>
          </section>
        )}
        
        {tab === "Repayments" && (
          <GenericView title="Credtrack Repayments"
            lines={[
              "1,247 active financed packs · 96.2% on-time rate",
              "Auto-lockdown triggers after 7 missed days (configurable)",
              "Today's settlements: 312 packs · UGX 4.1M processed",
              "Next batch reconcile at 18:00 UTC",
            ]} />
        )}

        {/* Dynamic & Functioning Swap-Station Routing Component */}
        {tab === "Routing" && (
          <section className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-7 panel p-5 space-y-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Kampala Metro Router</div>
                <h3 className="mt-0.5 text-sm font-medium flex items-center gap-2">
                  <Compass className="h-4 w-4 text-primary" /> Active Swap Infrastructure
                </h3>
              </div>
              <input
                type="text"
                value={stationRouteQuery}
                onChange={(e) => setStationRouteQuery(e.target.value)}
                placeholder="Search station by identifier or keyword..."
                className="w-full rounded border border-border bg-background px-3 py-2 text-mono text-xs outline-none focus:border-primary"
              />
              <div className="overflow-x-auto">
                <table className="w-full text-mono text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground text-[11px]">
                      <th className="pb-2">Station ID</th>
                      <th className="pb-2">Location/Hub Name</th>
                      <th className="pb-2 text-right">Load</th>
                      <th className="pb-2 text-right">Queue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {swapStations.map(st => (
                      <tr key={st.id} className="border-b border-border/30 hover:bg-secondary/20">
                        <td className="py-2.5 font-medium text-foreground">{st.id}</td>
                        <td className="py-2.5 text-muted-foreground">{st.name}</td>
                        <td className="py-2.5 text-right">
                          <span className={st.load > 80 ? "text-destructive" : st.load > 60 ? "text-warn" : "text-primary"}>
                            {st.load}%
                          </span>
                        </td>
                        <td className="py-2.5 text-right text-foreground">{st.queue} packs</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-5 space-y-4">
              <div className="panel p-5 bg-primary/5 border-primary/20">
                <h4 className="text-xs font-semibold uppercase text-primary tracking-wide flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" /> Automated Load Balancing Engine
                </h4>
                <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                  Predictive ML engine anticipates a peak across Kampala corridors between <span className="text-foreground">17:30–19:00</span>.
                </p>
                <div className="mt-4 p-3 rounded bg-background border border-border/80 space-y-2">
                  <div className="text-[10px] uppercase font-bold text-warn">Active Mitigation Directive</div>
                  <p className="text-mono text-[11px]">
                    Rerouting <span className="text-foreground font-semibold">6 inbound riders</span> away from <span className="text-destructive font-semibold">STN-KLA-019</span> (92% Depth Capacity) to Ntinda Hub.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Dynamic & Functioning Security & Cryptography Component */}
        {tab === "Security" && (
          <section className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-6 panel p-5 space-y-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Cryptographic Foundations</div>
                <h3 className="mt-0.5 text-sm font-medium flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Key Attestation & Encryption Status
                </h3>
              </div>
              <div className="space-y-2 text-mono text-xs">
                <div className="flex justify-between p-2 rounded bg-secondary/30">
                  <span className="text-muted-foreground">Asymmetric Architecture</span>
                  <span className="text-foreground font-medium">Ed25519 Enclave Keys</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-secondary/30">
                  <span className="text-muted-foreground">Transport Security</span>
                  <span className="text-primary font-medium">TLS 1.3 over MQTT Core</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-secondary/30">
                  <span className="text-muted-foreground">Certificate Pinning</span>
                  <span className="text-primary flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> ENABLED</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-secondary/30">
                  <span className="text-muted-foreground">Handshake Tampering (24h)</span>
                  <span className="text-foreground font-medium">0 anomalous attempts</span>
                </div>
              </div>
              <button 
                onClick={handleForceKeyRotation}
                disabled={keyRotating}
                className="w-full mt-2 rounded border border-primary bg-primary/10 hover:bg-primary/20 text-primary text-mono text-xs py-2 px-4 transition-colors font-medium"
              >
                {keyRotating ? "Rotating Operational Ephemeral Pairs..." : "Force Manual Key Rotation Sequence"}
              </button>
            </div>
            <div className="col-span-12 lg:col-span-6 panel p-5 border-warn/20 bg-warn/5 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-semibold uppercase text-warn tracking-wide flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5" /> Hardware Integrity Audit
                </h4>
                <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                  Every connected device validates structural signatures against internal cryptographic roots during handshake negotiation.
                </p>
                <div className="mt-4 space-y-1 text-mono text-[11px]">
                  <div><span className="text-muted-foreground">Active Pack Attestation:</span> Verified</div>
                  <div><span className="text-muted-foreground">Firmware Signature Block:</span> 0x7A11C · SHA256 OK</div>
                </div>
              </div>
              <div className="mt-4 p-3 rounded border border-border bg-background text-[10px] text-muted-foreground text-mono">
                System Enforcement: Non-authenticated handshakes automatically place the internal hardware state into lockdown.
              </div>
            </div>
          </section>
        )}

        {/* Dynamic & Functioning Console Settings Component */}
        {tab === "Settings" && (
          <section className="panel p-5 space-y-6">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Administration System</div>
              <h3 className="mt-0.5 text-sm font-medium flex items-center gap-2">
                <Sliders className="h-4 w-4 text-primary" /> Global Platform Configurations
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-mono text-xs">
              <div className="space-y-3">
                <label className="block">
                  <span className="text-muted-foreground block mb-1">Telemetry Cadence Window ({settingsCadence}ms)</span>
                  <input 
                    type="range" 
                    min="200" 
                    max="3000" 
                    step="100"
                    value={settingsCadence} 
                    onChange={(e) => setSettingsCadence(Number(e.target.value))}
                    className="w-full accent-primary h-1 bg-secondary rounded-lg appearance-none cursor-pointer"
                  />
                </label>
                <div className="text-[11px] text-muted-foreground leading-normal">
                  Controls the frequency of backend Server-Sent Events (SSE) pipe streaming telemetry updates.
                </div>
              </div>
              
              <div className="space-y-2">
                <span className="text-muted-foreground block">Safety Enforcement Strategy</span>
                <button 
                  onClick={() => setDualOperatorMode(!dualOperatorMode)}
                  className={`w-full text-left rounded border px-3 py-2 flex items-center justify-between transition-colors ${
                    dualOperatorMode ? "border-primary bg-primary/5 text-foreground" : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  <span>Dual-Operator Confirmation Core</span>
                  <span className={dualOperatorMode ? "text-primary font-bold" : "text-muted-foreground"}>
                    {dualOperatorMode ? "ACTIVE" : "DISABLED"}
                  </span>
                </button>
                <div className="text-[11px] text-muted-foreground">
                  When enabled, critical actions (like remote battery lockdown) require explicit secondary administrator confirmation.
                </div>
              </div>

              <div className="space-y-2 md:col-span-2 pt-2 border-t border-border/60">
                <div className="flex items-center gap-3 p-3 rounded-md bg-secondary/30 border border-border">
                  <UserCheck className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <div className="text-xs text-foreground font-medium">Session Operator Identity</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">control@spiro.io · Infrastructure Management Hub</div>
                  </div>
                  <div>
                    <select 
                      value={operatorRole}
                      onChange={(e) => setOperatorRole(e.target.value)}
                      className="bg-background border border-border rounded text-mono px-2 py-1 outline-none text-xs text-foreground focus:border-primary"
                    >
                      <option value="fleet-admin">Role: Fleet Administrator</option>
                      <option value="security-officer">Role: Security Officer</option>
                      <option value="read-only">Role: Read-Only Operator</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <footer className="text-mono pt-2 text-center text-[10px] text-muted-foreground">
          SPIRO IoT Platform · Enterprise Hub · all telemetry TLS 1.3 over MQTT/4G
        </footer>
      </main>
    </div>
  );
}