const {defineConfig} = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: [
      'android/**',
      'ios/**',
      'builds/**',
      'coverage/**',
      'docs/**',
      'mobile-engineer-candidate-kit/**',
      '.expo/**'
    ]
  },
  {
    rules: {
      'no-console': 'error',
      'no-nested-ternary': 'error',
      'prefer-const': 'error',
      'no-restricted-syntax': [
        'error',
        {selector: "VariableDeclaration[kind='let']", message: 'Use const.'},
        {selector: "VariableDeclaration[kind='var']", message: 'Use const.'}
      ],
      'import/no-default-export': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {name: 'expo-file-system/legacy', message: 'Use the File API of expo-file-system.'},
            {
              name: '@react-navigation/native',
              importNames: ['useNavigation'],
              message: 'Use useAppNavigation from src/navigation/hooks.'
            },
            {
              name: 'react-native',
              importNames: ['Text', 'AppState', 'SafeAreaView'],
              message: 'Use TextLine, appStateStore and ScreenLayout.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error'
    }
  },
  {
    files: ['jest.setup.js', 'tests/**/*.js', 'tests/**/*.mjs'],
    languageOptions: {globals: {...globals.jest, ...globals.node}}
  },
  {
    files: ['src/utils/logger/**'],
    rules: {'no-console': 'off'}
  },
  {
    files: [
      'src/hooks/sensors/useAppStateWatcher.ts',
      'src/components/ui/TextLine.tsx',
      'src/navigation/hooks/useAppNavigation.ts'
    ],
    rules: {'no-restricted-imports': 'off'}
  },
  {
    files: ['app.config.ts'],
    rules: {'import/no-default-export': 'off'}
  }
]);
