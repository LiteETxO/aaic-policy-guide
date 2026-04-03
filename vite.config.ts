import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/aaic-policy-guide/",
  server: {
    host: "::",
    port: 8080,
    hmr: false,
    // Prevent browsers from caching dev prebundle chunks (can cause "Unexpected end of script")
    headers: {
      "Cache-Control": "no-store",
    },
  },
  // Force dependency pre-bundling to re-run after config changes/restarts
  optimizeDeps: {
    force: true,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
