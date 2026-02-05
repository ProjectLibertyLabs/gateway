import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/modules/*.ts", "src/runtime/*.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  outDir: "dist",
  tsconfig: "tsconfig.json",
  platform: "node",
  shims: true,
});
