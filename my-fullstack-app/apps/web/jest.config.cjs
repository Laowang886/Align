/* global module */
module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["<rootDir>/**/*.test.ts?(x)"],
  transform: {
    "^.+\\.(t|j)sx?$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
          module: "commonjs",
          moduleResolution: "node",
          esModuleInterop: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@repo/shared$": "<rootDir>/../../packages/shared/src/index.ts",
    "\\.module\\.css$": "<rootDir>/test/style-mock.ts",
  },
};
