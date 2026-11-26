module.exports = {
  projects: [
    {
      displayName: 'mmgeo',
      testEnvironment: 'node',
      moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
      },
      testMatch: ['<rootDir>/src/test/**/*.test.ts?(x)'],
    },
    '<rootDir>/packages/mmgeo-map',
  ],
};
