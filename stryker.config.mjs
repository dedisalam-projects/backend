// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  packageManager: 'npm',
  reporters: ['html', 'clear-text', 'progress'],
  testRunner: 'jest',
  coverageAnalysis: 'perTest',
  jest: {
    projectType: 'custom',
    configFile: 'apps/gateway/jest.config.cts',
    config: {
      testEnvironment: 'node',
    },
  },
  mutate: [
    'apps/gateway/src/**/*.ts',
    '!**/*.spec.ts',
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/environments/**'
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
    break: 85,
  },
  concurrency: 6,
  timeoutMS: 30000,
};
