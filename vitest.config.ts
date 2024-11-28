import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.ts"],
    },
    include: ["**/*.spec.ts"],
    reporters: ["junit"],
    outputFile: {
      junit: "coverage/test-report.junit.xml",
    },
  },
});
