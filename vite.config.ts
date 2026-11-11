import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";

// Dev port 3030 is registered in Projects/_ports/ports.json (slot 30). Override: FRONTEND_PORT.
const PORT = Number(process.env.FRONTEND_PORT) || 3030;

export default defineConfig({
  plugins: [cloudflare({ viteEnvironment: { name: "ssr" } }), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    host: "127.0.0.1",
    port: PORT,
    strictPort: true,
  },
  // `vite preview` reuses the registered port, so stop the dev server before previewing a build.
  preview: {
    host: "127.0.0.1",
    port: PORT,
    strictPort: true,
  },
});
