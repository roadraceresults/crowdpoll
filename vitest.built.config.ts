import { defineConfig } from "vitest/config";
import base from "./vitest.config.js";

export default defineConfig({
  test: {
    ...base.test,
    include: ["tests/client-*.test.ts"],
    env: { TEST_PUBLIC_DIR: "dist/public" }
  }
});
