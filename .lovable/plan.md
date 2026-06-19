## Goal

Replace the simulated in-memory data in the Spiro BMS console with a real database. Fleet grows from 38 → **600 assets**. Telemetry, events, and authorized chargers all persist.

## Backend

Enable **Lovable Cloud** (managed Postgres + auth + server APIs, no external account). All tables live in `public` with RLS on and explicit GRANTs.

## Schema (4 tables)

```text
packs                       -- the 600 battery packs (fleet roster)
  id              text PK   -- e.g. UG-KLA-00284
  rider           text
  chemistry       text      -- "LFP 14S4P · 51.2V · 30Ah"
  pubkey          text      -- ed25519 pack identity
  lat, lng        double precision
  status          text      -- ok | warn | danger | offline
  soc, soh        numeric
  last_seen       timestamptz

telemetry_frames            -- time-series, one row per 800ms frame
  id              bigserial PK
  pack_id         text FK → packs(id)
  ts              timestamptz
  cells           jsonb      -- [{v,t,soc}, ...] 56 cells
  current_a       numeric
  power_w         numeric
  rssi            int
  rtt_ms          int
  risk_score      numeric
  -- index (pack_id, ts desc)

events                       -- audit log
  id              bigserial PK
  ts              timestamptz default now()
  pack_id         text
  kind            text       -- handshake | lockdown | charger_auth | anomaly | info
  severity        text       -- info | warn | danger
  message         text
  meta            jsonb

authorized_chargers          -- whitelist used by charger-auth panel
  id              text PK    -- e.g. STN-KLA-019
  pubkey          text       -- ed25519 charger key
  label           text
  enabled         boolean default true
  created_at      timestamptz default now()
```

RLS: authenticated read on everything; writes only via server functions (service role). `authorized_chargers` write requires `admin` role (uses the `has_role` pattern).

## Seed data

Migration seeds:
- **600 packs** spread around Kampala (lat/lng jittered around 0.3476°N, 32.5825°E), realistic SoC/risk distribution.
- A small starter set of `authorized_chargers` (STN-KLA-001 … 020).

## Server functions (`src/lib/bms/*.functions.ts`)

- `listPacks()` — fleet roster (replaces `useFleet` simulator).
- `getPack(id)` — single pack detail.
- `getLatestFrame(packId)` — most recent telemetry row.
- `getFrameHistory(packId, minutes)` — sparklines / charts.
- `listEvents(limit)` — event log.
- `listAuthorizedChargers()` + `setChargerEnabled(id, enabled)` (admin only).
- `ingestFrame(frame)` — writes a telemetry row + updates `packs.last_seen/soc/status`. Used by the SSE simulator so the DB fills with realistic history even before real hardware is connected.

## Wiring the UI

- `useFleet(...)` → `useQuery` against `listPacks`, polled every 5s. Default `assets = useFleet(600)` (count comes from DB).
- `useTelemetryStream` keeps the SSE transport for live feel, but the **server** SSE route now reads/writes Postgres: each tick `ingestFrame` persists, then streams the saved row to clients. Result: same live UI, real history behind it.
- `EventLog` → `useQuery(listEvents)` + invalidate on lockdown/handshake actions.
- `ChargerAuthPanel` → `listAuthorizedChargers`; "Authorize charger" toggle calls `setChargerEnabled`.
- `LockdownPanel` → writes an `events` row of kind `lockdown` and flips `packs.status`.

## Auth

Add a minimal `/auth` page (email + password, plus Google) and put the dashboard under `_authenticated/`. Without this, RLS would block reads. Operator role (`fleet-admin`) gates charger whitelist edits via `has_role`.

## Out of scope for this pass

- Real hardware MQTT ingestion (the `ingestFrame` server fn is the seam where real devices would plug in later).
- Historical charts beyond sparklines (can come next once data is flowing).

## Deliverables

1. Enable Lovable Cloud.
2. One migration: 4 tables + GRANTs + RLS + `has_role` + seed 600 packs + seed chargers.
3. Server functions above.
4. Refactor `useFleet`, `useTelemetryStream` server route, `EventLog`, `ChargerAuthPanel`, `LockdownPanel` to read/write the DB.
5. `/auth` page + `_authenticated/` gate around the console.

Approve and I'll enable Cloud and ship it.