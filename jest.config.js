module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  collectCoverageFrom: [
    "lib/**/*.ts",
    "lambda/**/*.ts",
    "!lib/**/*.d.ts",
    "!lambda/**/node_modules/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
  modulePathIgnorePatterns: ["<rootDir>/cdk.out/"],
  testTimeout: 10000,
};
