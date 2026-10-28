import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/helpers/global-setup.ts"],
    // Every suite runs against its own database in the run's embedded PostgreSQL
    // but shares process-level fake-timer state; suites run sequentially to stay
    // deterministic.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 120000
  }
});
