import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/__tests__/**/*.ts"],
    exclude: ["src/__tests__/fixtures/**"],
    snapshotFormat: {
      printBasicPrototype: true,
    },
  },
});
