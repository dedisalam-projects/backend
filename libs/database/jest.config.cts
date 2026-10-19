module.exports = {
  displayName: 'database',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/libs/database',
  testMatch: ['**/*.spec.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/index.ts',
    '!src/**/*.spec.ts',
    '!src/**/schemas/**',
    '!src/**/database.module.ts',
    '!src/**/redis.module.ts',
  ],
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
};
