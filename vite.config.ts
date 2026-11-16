import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withPreview, type Route } from "./web/src/linkPreviews";
import { DEFAULT_DISCORD_CLIENT_ID, inviteUrl } from "./web/src/discordApp";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "dist", "client");

/**
 * Client-side routes that must exist as real files. Keep in sync with the
 * <Route> list in web/src/App.tsx.
 */
const ROUTES: Exclude<Route, "">[] = ["features", "commands", "terms", "privacy"];

/**
 * GitHub Pages has no SPA fallback: it serves the file at the requested path,
 * or its own 404. wouter routes /commands on the client, so a cold load or a
 * refresh of anything but / would miss.
 *
 * The usual fix is to ship index.html again as 404.html and let Pages serve it
 * for everything. That renders correctly but answers 404 for real pages, which
 * crawlers and link previews take at face value. So each known route also gets
 * its own directory index — /commands/index.html answers 200 — and 404.html is
 * left to do its actual job for paths that really are missing.
 */
function staticRoutes(invite: string): Plugin {
  return {
    name: "static-routes",
    apply: "build",
    closeBundle() {
      const shellPath = path.join(outDir, "index.html");
      const shell = readFileSync(shellPath, "utf8");
      writeFileSync(path.join(outDir, "404.html"), shell);
      // Each copy also carries that page's own link preview: its title and
      // description, and for some pages a Discord card (web/src/linkPreviews.ts).
      // Discord runs no script, so the shell's home-page tags would otherwise
      // be what every link shows.
      writeFileSync(shellPath, withPreview(shell, "", invite));
      for (const route of ROUTES) {
        mkdirSync(path.join(outDir, route), { recursive: true });
        writeFileSync(path.join(outDir, route, "index.html"), withPreview(shell, route, invite));
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  root: path.resolve(here, "web"),
  // The invite in the link previews is the app's own (web/src/config.ts):
  // VITE_DISCORD_CLIENT_ID from web/.env* if set, else the default id.
  plugins: [react(), tailwindcss(), staticRoutes(inviteUrl(
    loadEnv(mode, path.resolve(here, "web"), "VITE_").VITE_DISCORD_CLIENT_ID ?? DEFAULT_DISCORD_CLIENT_ID,
  ))],
  resolve: {
    alias: {
      "@": path.resolve(here, "web", "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    // Deployed as-is to GitHub Pages by .github/workflows/pages.yml.
    outDir,
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
}));
