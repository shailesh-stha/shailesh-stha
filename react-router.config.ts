import type { Config } from "@react-router/dev/config";
import { prerenderPaths } from "./app/content/routes";

export default {
  // Same value as `base` in vite.config.ts (SITE_BASE, default "/").
  basename: process.env.SITE_BASE || "/",
  // Load the whole route list with the first page instead of asking a server endpoint (/__manifest) for it. Static hosts such as
  // GitHub Pages have no such endpoint, and for 8 routes the cost is negligible.
  routeDiscovery: { mode: "initial" },
  // Server rendering stays on so server routes (contact form, LLM endpoint) can be added later without a migration.
  ssr: true,
  // Every public page is rendered to static HTML at build time (SEO, link previews, no JS needed to read).
  async prerender() {
    return prerenderPaths();
  },
} satisfies Config;
