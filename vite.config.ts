import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(async () => {
  const rawPort = process.env.PORT;
  const port =
    rawPort && !Number.isNaN(Number(rawPort)) && Number(rawPort) > 0
      ? Number(rawPort)
      : 3030;

  const basePath = process.env.BASE_PATH ?? "/";

  const extraPlugins: ReturnType<typeof react>[] = [];

  if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined) {
    try {
      const [errorModal, cartographer, devBanner] = await Promise.all([
        import("@replit/vite-plugin-runtime-error-modal").then((m) => m.default()),
        import("@replit/vite-plugin-cartographer").then((m) =>
          m.cartographer({ root: path.resolve(import.meta.dirname, "..") })
        ),
        import("@replit/vite-plugin-dev-banner").then((m) => m.devBanner()),
      ]);
      extraPlugins.push(errorModal, cartographer, devBanner);
    } catch {
      // Outside Replit — skip optional plugins
    }
  }

  return {
    base: basePath,
    plugins: [react(), tailwindcss(), ...extraPlugins],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      port,
      strictPort: false,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        strict: true,
      },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
