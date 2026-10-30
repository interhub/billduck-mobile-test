/** Integration tests: the API client and the import controller against the real mock server. */
const babelPresetExpo = require.resolve('babel-preset-expo', {
  paths: [require.resolve('expo/package.json')]
});

module.exports = {
  preset: 'jest-expo/node',
  roots: ['<rootDir>/tests/integration'],
  testMatch: ['**/*.test.ts'],
  globalSetup: '<rootDir>/tests/integration/support/globalSetup.js',
  globalTeardown: '<rootDir>/tests/integration/support/globalTeardown.js',
  // Every file shares the one mock process and its state: the files run one after another.
  maxWorkers: 1,
  testTimeout: 60_000,
  silent: true,
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', {presets: [babelPresetExpo]}]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  }
};
