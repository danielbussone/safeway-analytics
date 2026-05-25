import react from "@vitejs/plugin-react";
import { config as dotenvConfig } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");
dotenvConfig({ path: resolve(repoRoot, ".env") });

export default defineConfig(() => {
  const apiTarget = (
    process.env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:4001"
  ).trim();

  return {
    envDir: repoRoot,
    plugins: [react()],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },
    server: {
      port: 5174,
      proxy: {
        "/graphql": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
