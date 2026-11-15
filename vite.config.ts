import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Em desenvolvimento, o front chama /api/* e o Vite repassa para o serviço de IA (FastAPI).
// Assim não há problema de CORS e a SERVICE_API_KEY fica só no servidor, nunca no navegador.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.API_TARGET || "http://localhost:8000";
  const apiKey = env.SERVICE_API_KEY || "";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
          headers: apiKey ? { "X-API-Key": apiKey } : {},
        },
      },
    },
  };
});
