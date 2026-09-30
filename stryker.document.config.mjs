// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  packageManager: 'npm',
  reporters: ['clear-text', 'progress'],
  testRunner: 'jest',
  coverageAnalysis: 'perTest',
  jest: {
    projectType: 'custom',
    configFile: 'apps/gateway/jest.config.cts',
    config: {
      testEnvironment: 'node',
      testMatch: ['**/apps/gateway/src/document/**/*.spec.ts'],
    },
  },
  mutate: [
    'apps/gateway/src/document/document.controller.ts',
    'apps/gateway/src/document/document.gateway.ts',
    '!**/*.spec.ts',
    '!**/*.module.ts',
  ],
  ignorePatterns: [
    '.nx/**',
    'dist/**',
    'tmp/**',
    '.stryker-tmp/**'
  ],
  thresholds: {
    high: 80,
    low: 60,
    break: null,
  },
  concurrency: 6,
  timeoutMS: 60000,
};
