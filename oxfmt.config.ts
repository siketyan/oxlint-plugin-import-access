import { defineConfig } from "oxfmt";

export default defineConfig({
  ignorePatterns: ["src/__tests__/fixtures/**", "CHANGELOG.md"],
  sortImports: true,
  sortProperties: true,
});
