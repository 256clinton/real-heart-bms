import { defineConfig } from "vite";
import { tanstackStartVite } from "@tanstack/start-vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    // This plugin acts as the bridge for Tailwind, Nitro, and routing 
    tanstackStartVite({
      server: {
        entry: "server", // Keeps your custom src/server.ts redirect intact
      },
    }),
    tsconfigPaths(), // Keeps your clean path aliases working
  ],
});