import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const n8nUrl = env.VITE_N8N_API_URL || "";
  const mkUrl = env.VITE_MK_BASE_URL || "";
  const chatwootUrl = env.VITE_CHATWOOT_API_URL || "";
  let proxy: Record<string, any> = {}; function fixProxy(proxy: Record<string, any>) { return proxy as Record<string, string | { target: string; changeOrigin: boolean; rewrite?: (path: string) => string; secure: boolean; }>; }
  if (n8nUrl && mode === "development") {
    try {
      const u = new URL(n8nUrl);
      proxy["/api/n8n"] = {
        target: u.origin,
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/n8n/, u.pathname),
        secure: true,
      };
    } catch (_) {
      /* ignore */
    }
  }
  if (chatwootUrl && mode === "development") {
    try {
      const u = new URL(chatwootUrl);
      proxy["/api/chatwoot"] = {
        target: u.origin,
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/chatwoot/, ""),
        secure: true,
      };
    } catch (_) {
      /* ignore */
    }
  }
  if (mkUrl && mode === "development") {
    try {
      const u = new URL(mkUrl);
      proxy["/api/mk"] = {
        target: u.origin,
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/mk/, ""),
        secure: false,
      };
    } catch (_) {
      /* ignore */
    }
  }

  return {
    server: {
      host: "::",
      port: 8080,
      proxy: fixProxy(proxy),
    },
    plugins: [
      react(),
      mode === 'development' &&
      componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
