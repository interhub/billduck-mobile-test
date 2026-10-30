const {existsSync, readFileSync} = require('node:fs');
const path = require('node:path');
const {defineConfig} = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');
const globals = require('globals');

const CODE_FILES = ['**/*.{js,mjs,ts,tsx}'];

const SHORT_NAMES = ['i', 'j', 'k', 'e', 'err', 'res', 'req', 'item', 'cur', 'val', 'tmp', 'obj'];

/** The written code rules that a syntax selector can check (`.claude/rules/rn-code-styles.md`). */
const CODE_BANS = [
  {selector: "VariableDeclaration[kind='let']", message: 'Use const.'},
  {selector: "VariableDeclaration[kind='var']", message: 'Use const.'},
  {selector: 'ClassDeclaration, ClassExpression', message: 'Write plain functions, never classes.'},
  {selector: 'ExportAllDeclaration, ExportNamedDeclaration[source]', message: 'No barrels.'},
  {
    selector:
      'CallExpression[callee.name=/^(useEffect|useLayoutEffect)$/] > ArrowFunctionExpression[async=true]',
    message: 'Never make an effect callback async.'
  },
  {
    selector: 'MemberExpression[object.name=/^(it|test|describe)$/][property.name=/^(only|skip)$/]',
    message: 'Never commit .only or .skip.'
  }
];

const UNKNOWN_BAN = {
  selector: 'TSUnknownKeyword',
  message: 'unknown only for a caught failure and inside a typed JSON guard.'
};

const COLOR_BAN = {
  selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
  message: 'Colors come from UI_COLORS.'
};

const FONT_BAN = {
  selector: 'Property[key.name=/^(fontSize|fontFamily|lineHeight|fontWeight)$/]',
  message: 'Font sizes and families live only in TextLine.'
};

/** JSX stays clean: values and conditional elements are computed in the component body. */
const JSX_BANS = [
  {selector: 'JSXExpressionContainer ConditionalExpression', message: 'No ternary inside JSX.'},
  {selector: 'JSXExpressionContainer LogicalExpression', message: 'No && or ?? inside JSX.'},
  {
    selector: 'JSXAttribute > JSXExpressionContainer > CallExpression',
    message: 'No call as a prop value: compute it in the component body.'
  },
  {
    selector: "JSXAttribute[name.name='style'] > JSXExpressionContainer > ObjectExpression",
    message: 'No inline style: use the style hook.'
  },
  {
    selector:
      "JSXAttribute[name.name='style'] > JSXExpressionContainer > ArrayExpression > ObjectExpression",
    message: 'No inline style: use the style hook.'
  },
  {
    selector:
      "CallExpression[callee.object.name='StyleSheet'][callee.property.name='create']:not(CallExpression[callee.name='getResponsiveStylesHook'] CallExpression)",
    message: 'StyleSheet.create only inside getResponsiveStylesHook.'
  }
];

const restrictedSyntax = (...selectors) => ['error', ...CODE_BANS, ...selectors];

const PARENT_IMPORTS = [
  {group: ['../*'], message: 'Import through @/src/...: relative imports only between siblings.'}
];

/** Folders this machine keeps out of git (`.git/info/exclude`) stay out of the lint as well. */
const readLocallyExcludedFolders = () => {
  const excludeFile = path.join(__dirname, '.git', 'info', 'exclude');
  if (!existsSync(excludeFile)) {
    return [];
  }
  return readFileSync(excludeFile, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.endsWith('/') && !line.startsWith('#'))
    .map((folder) => `${folder.replace(/^\//, '')}**`);
};

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
      '.expo/**',
      ...readLocallyExcludedFolders()
    ]
  },
  {
    rules: {
      'no-console': 'error',
      'no-nested-ternary': 'error',
      'no-ternary': 'error',
      'prefer-const': 'error',
      'no-param-reassign': ['error', {props: true}],
      'id-denylist': ['error', ...SHORT_NAMES],
      'max-lines': ['error', {max: 300}],
      'import/no-cycle': 'error',
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
          ],
          patterns: PARENT_IMPORTS
        }
      ]
    }
  },
  {
    files: CODE_FILES,
    rules: {'no-restricted-syntax': restrictedSyntax(UNKNOWN_BAN, COLOR_BAN, FONT_BAN)}
  },
  {
    files: ['**/*.tsx'],
    rules: {'no-restricted-syntax': restrictedSyntax(UNKNOWN_BAN, COLOR_BAN, FONT_BAN, ...JSX_BANS)}
  },
  {
    files: ['src/components/ui/TextLine.tsx'],
    rules: {'no-restricted-syntax': restrictedSyntax(UNKNOWN_BAN, COLOR_BAN, ...JSX_BANS)}
  },
  {
    files: ['src/constants/UI_COLORS.ts', 'app.config.ts'],
    rules: {'no-restricted-syntax': restrictedSyntax(UNKNOWN_BAN, FONT_BAN)}
  },
  {
    files: [
      'src/api/**/*.ts',
      'src/utils/errors/**/*.ts',
      'src/utils/json/**/*.ts',
      'src/services/importController/operationRepository.ts'
    ],
    rules: {'no-restricted-syntax': restrictedSyntax(COLOR_BAN, FONT_BAN)}
  },
  {
    files: [
      'src/**/*.{ts,tsx}',
      'App.tsx',
      'index.ts',
      'app.config.ts',
      'plugins/**',
      'scripts/**'
    ],
    ignores: ['**/__tests__/**'],
    rules: {
      'max-lines-per-function': ['error', {max: 60, skipBlankLines: true, skipComments: true}]
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
    files: ['jest.setup.js', 'jest.globalSetup.js', 'tests/**/*.js', 'tests/**/*.mjs'],
    languageOptions: {globals: {...globals.jest, ...globals.node}}
  },
  {
    files: ['eslint.config.js'],
    languageOptions: {globals: globals.node}
  },
  {
    files: ['src/utils/logger/**'],
    rules: {'no-console': 'off'}
  },
  {
    files: [
      'src/hooks/sensors/useAppStateWatcher.ts',
      'src/components/ui/TextLine.tsx',
      '**/__tests__/**',
      'src/navigation/hooks/useAppNavigation.ts'
    ],
    rules: {'no-restricted-imports': ['error', {patterns: PARENT_IMPORTS}]}
  },
  {
    files: ['app.config.ts'],
    rules: {'import/no-default-export': 'off'}
  },
  {
    // Expo config plugins edit the config object they receive: that is the plugin API.
    files: ['plugins/**'],
    rules: {'no-param-reassign': 'off'}
  },
  {
    // The rules name the logger methods d, w and e.
    files: ['src/utils/logger/logger.ts'],
    rules: {'id-denylist': 'off'}
  },
  {
    // A plain Node process without the alias starts the kit's mock for the integration tests.
    files: ['tests/integration/support/startMock.mjs'],
    rules: {'no-restricted-imports': 'off'}
  }
]);
