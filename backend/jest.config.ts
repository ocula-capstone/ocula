import type { Config } from 'jest';

// The backend is an ES module project ("type": "module"), so ts-jest runs in ESM mode.
const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true }],
  },
  moduleNameMapper: {
    // Source files import each other with a .js ending; Jest needs the .ts file.
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/generated/**'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  // Decorators from class-validator and class-transformer need this loaded first.
  setupFiles: ['reflect-metadata'],
};

export default config;
