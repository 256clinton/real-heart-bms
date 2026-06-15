# real-heart-bms 🫀🔋

A modern, full-stack, open-source Battery Management System (BMS) IoT dashboard built using **TanStack Start**, **TypeScript**, and **Bun**. This system is designed to simulate, monitor, and manage high-power smart battery fleets (such as 72V LiFePO4 commercial packs) by ingesting live telemetry streams, mapping physical coordinates, and rendering deep diagnostic analytics.

## 🚀 Key Features

* **Live Telemetry Streams:** Real-time data visualization tracking voltage, current draw, state of charge (SoC), state of health (SoH), and internal cell temperatures.
* **Geospatial Tracking & Fleet Mapping:** An interactive map view designed to plot real-time GPS coordinates of active batteries and automated swap station cabinets.
* **Cell Voltage Matrix Diagnostics:** A granular matrix visualization monitoring individual series cell groups to trace cell balancing behaviors.
* **Authentication & Remote Control:** Administrative console simulating secure cryptographic handshakes and over-the-air (OTA) hardware lockdown safety mechanisms.

## 🛠️ Tech Stack

* **Framework:** [TanStack Start](https://tanstack.com/router/v1/docs/start/overview) (Full-stack React with Nitro engine server capabilities)
* **Language:** [TypeScript](https://www.typescriptlang.org/)
* **Runtime & Package Manager:** [Bun](https://bun.sh/)
* **Styling:** Tailwind CSS & Lucide React Icons

## 📦 Prerequisites

Ensure you have **Bun** installed locally on your development machine. If you don't have it yet, install it via PowerShell:

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"

#⚙️ Getting Started
Follow these steps to clone the repository and spin up your local development server:

#Clone the repository:

Bash
git clone 
cd real-heart-bms
Install project dependencies:

Bash
bun install
Start the local development server:

Bash
bun dev
Open the application:
Open your browser and navigate to http://localhost:3000 to view the running dashboard interface.

📁 Project Structure
Plaintext
├── .lovable/             # Local generation metadata
├── src/
│   ├── components/       # Reusable UI widgets (gauges, charts, maps)
│   ├── routes/           # TanStack Start file-based routing/pages
│   ├── server/           # Backend API route entry points & telemetry endpoints
│   └── styles/           # Global Tailwind configurations
├── bun.lock              # Bun lockfile
├── package.json          # Project dependencies and meta
└── vite.config.ts        # Open-source TanStack Start + Vite build pipeline
🤝 Contributing
We welcome contributions from developers, students, and engineers interested in EV infrastructure and IoT dashboards!

To contribute:

Look over our open dashboard routes or check out the Issues tab for tasks labeled good first issue.

Fork the repository and create your feature branch (git checkout -b feature/AmazingFeature).

Commit your changes (git commit -m 'Add some AmazingFeature').

Ensure the system compiles cleanly:

Bash
bun run build
Push to the branch (git push origin feature/AmazingFeature) and open a Pull Request.