import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base is the GitHub Pages project path (/genesrow/). Set via GITHUB_REPOSITORY
// during the Pages workflow; defaults to /genesrow/ so local preview matches.
const repo = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "genesrow";

export default defineConfig({
  plugins: [react()],
  base: `/${repo}/`,
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
