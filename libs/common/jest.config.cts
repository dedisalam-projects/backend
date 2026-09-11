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
    'src/filters/ws-exception.filter.ts',
    'src/guards/ws-jwt.guard.ts',
    'src/guards/ws-roles.guard.ts',
    'src/decorators/public.decorator.ts',
    'src/decorators/roles.decorator.ts',
    'src/dto/admin-user.dto.ts',
    'src/dto/auth.dto.ts',
    'src/dto/notification-broadcast.dto.ts',
    'src/lib/common.module.ts',
  ],
  coverageReporters: ['text', 'text-summary', 'html'],
};
