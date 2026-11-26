module.exports = {
  displayName: 'mmgeo-map',
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  // Test against the core package's source in this repo.
  moduleNameMapper: { '^@tm11/mmgeo(/.*)?$': '<rootDir>/../../src$1' },
  testMatch: ['<rootDir>/test/**/*.test.ts?(x)'],
};
