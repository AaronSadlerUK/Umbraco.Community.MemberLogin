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
      external: [/^@umbraco-cms\//], // don't bundle the backoffice itself
    },
  },
  // Absolute base so Vite's default content-hashed chunk filenames
  // (e.g. entrypoint-a1b2c3.js) resolve under App_Plugins in the backoffice.
  // The hashes are what bust the browser cache between releases.
  base: "/App_Plugins/MemberLogin/",
});
