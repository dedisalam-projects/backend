const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '.+\\.dto\\.ts$',
    '.+\\.interface\\.ts$',
    '.+\\.module\\.ts$',
    '.+/main\\.ts$',
    '.+/index\\.ts$',
  ],
};
