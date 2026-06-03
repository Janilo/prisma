import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://tbypnczqalufeeccsakv.supabase.co"),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify("sb_publishable_9XUz7bxHRV1HpfoEANEj9Q_eS9yobpS"),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify("tbypnczqalufeeccsakv"),
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
      dedupe: ["react", "react-dom", "@tanstack/react-router"],
    },
  },
});
