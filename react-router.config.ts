import type { Config } from "@react-router/dev/config";
import { prerenderPaths } from "./app/content/routes";

export default {
  // Server rendering stays on so server routes (contact form, LLM endpoint) can be added later without a migration.
  ssr: true,
  // Every public page is rendered to static HTML at build time (SEO, link previews, no JS needed to read).
  async prerender() {
    return prerenderPaths();
  },
} satisfies Config;
