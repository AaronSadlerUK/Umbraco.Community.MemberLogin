import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: "member-login",
    },
    outDir: "../wwwroot/App_Plugins/MemberLogin",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external: [/^@umbraco-cms\//],
      output: {
        // Stable chunk names so dynamic-import manifest entries and committed
        // build output don't churn on every rebuild.
        chunkFileNames: "[name].js",
      },
    },
  },
});
