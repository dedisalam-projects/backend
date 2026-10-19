module.exports = {
  displayName: 'common',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/libs/common',
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/test/',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/index.ts',
    '!src/test/**',
  ],
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
};
