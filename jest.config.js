/** Unit tests: no network, no native modules, no mock server. */
module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  silent: true,
  globalSetup: '<rootDir>/jest.globalSetup.js',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // tsconfig points icon imports at their type declarations; tests run the compiled icons
    '^phosphor-react-native/src/icons/(.*)$':
      '<rootDir>/node_modules/phosphor-react-native/lib/commonjs/icons/$1'
  }
};
