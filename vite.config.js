import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command, mode = "development" }) => ({
  base: command === "serve" ? "/" : "/togs-heads-up/",
  plugins: [react()],
  // Never embed the account key in public builds, even if CI defines it.
  define: {
    "import.meta.env.VITE_OPENWEATHER_API_KEY": JSON.stringify(
      command === "serve" && mode === "development"
        ? loadEnv(mode, process.cwd(), "VITE_OPENWEATHER_").VITE_OPENWEATHER_API_KEY ?? ""
        : "",
    ),
  },
}));
