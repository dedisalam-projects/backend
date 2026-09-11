// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  packageManager: 'npm',
  reporters: ['html', 'clear-text', 'progress'],
  testRunner: 'jest',
  coverageAnalysis: 'off',
  jest: {
    projectType: 'custom',
    configFile: 'libs/common/jest.config.cts',
    config: {
      testEnvironment: 'node',
    },
  },
  mutate: [
    'libs/common/src/decorators/roles.decorator.ts',
    '!**/*.spec.ts',
  ],
  thresholds: {
    high: 80,
    low: 60,
    break: 50,
  },
  concurrency: 1,
  timeoutMS: 30000,
};
