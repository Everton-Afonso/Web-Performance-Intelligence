import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true,
    globalSetup: ["./tests/global-setup.ts"],
    // SQLite files are shared across DB-backed test files; run sequentially.
    fileParallelism: false
  }
});