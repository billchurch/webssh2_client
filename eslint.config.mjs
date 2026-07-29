import eslint from '@eslint/js'
import globals from 'globals'
import nPlugin from 'eslint-plugin-n'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import prettierPlugin from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'
import noUnsanitizedPlugin from 'eslint-plugin-no-unsanitized'
import tailwindcssPlugin from 'eslint-plugin-tailwindcss'

const projectRoot = new URL('.', import.meta.url).pathname

// airbnb-base has no flat-config successor, so the base ruleset below is
// @eslint/js recommended + eslint-plugin-n recommended (replacing
// plugin:node/recommended) plus every rule this project previously set
// explicitly via .eslintrc.json overrides. Airbnb's stylistic rules beyond
// those explicit overrides were intentionally not recreated.
export default [
  eslint.configs.recommended,
  nPlugin.configs['flat/recommended'],
  prettierConfig,
  {
    ignores: [
      'scripts/**',
      'client/public/**',
      'client/index.js',
      'index.js',
      'client/src/vite.config.js',
      'CHANGELOG.md',
      'client/.tsbuild/**',
      'tsconfig.tsbuildinfo'
    ]
  },
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021
      }
    },
    plugins: {
      prettier: prettierPlugin,
      'no-unsanitized': noUnsanitizedPlugin
    },
    rules: {
      'prettier/prettier': 'warn',
      'dot-notation': 'off',
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'func-names': 'off',
      'no-process-exit': 'off',
      'n/no-process-exit': 'off',
      'object-shorthand': 'off',
      'class-methods-use-this': 'off',
      'no-unsanitized/method': 'error',
      'no-unsanitized/property': 'error',
      'no-restricted-properties': [
        'error',
        {
          object: '*',
          property: 'innerHTML',
          message: 'Use textContent or safe DOM builders instead of innerHTML.'
        },
        {
          object: '*',
          property: 'outerHTML',
          message: 'Avoid outerHTML; use DOM APIs to replace nodes safely.'
        },
        {
          object: '*',
          property: 'insertAdjacentHTML',
          message:
            'Avoid insertAdjacentHTML; use DOM APIs to create and append elements.'
        },
        {
          object: 'document',
          property: 'write',
          message: 'document.write is disallowed.'
        },
        {
          object: 'document',
          property: 'writeln',
          message: 'document.writeln is disallowed.'
        }
      ]
    }
  },
  {
    files: [
      '**/tailwind.config.js',
      '**/postcss.config.js',
      '**/vite.config.js'
    ],
    rules: {
      'n/no-unpublished-import': 'off',
      'n/no-unpublished-require': 'off'
    }
  },
  {
    // Declaration files' `import`/`export from` specifiers resolve at
    // type-check time against sibling .d.ts files, not real runtime
    // modules — n/no-unpublished-import's publish-manifest check doesn't
    // account for that and false-positives on republished .js specifiers.
    files: ['**/*.d.ts'],
    rules: {
      'n/no-unpublished-import': 'off'
    }
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin
    },
    rules: {
      'prettier/prettier': 'warn',
      'no-undef': 'off',
      // @typescript-eslint/no-unused-vars below replaces the base rule, same
      // as plugin:@typescript-eslint/recommended did — leaving the base rule
      // on double-reports every type-only usage (interfaces, overloads) as
      // unused.
      'no-unused-vars': 'off',
      'n/no-missing-import': 'off',
      'n/no-unsupported-features/es-syntax': 'off',
      'n/no-extraneous-import': 'off',
      camelcase: 'off',
      'dot-notation': 'off',
      'no-use-before-define': [
        'error',
        { functions: false, classes: false, variables: false }
      ],
      'no-param-reassign': ['error', { props: false }],
      'no-alert': 'off',
      'no-plusplus': 'off',
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.name='setTimeout'][arguments.0.type='Literal']",
          message: 'Avoid string-based setTimeout; pass a function instead.'
        },
        {
          selector:
            "CallExpression[callee.name='setInterval'][arguments.0.type='Literal']",
          message: 'Avoid string-based setInterval; pass a function instead.'
        },
        {
          selector: "NewExpression[callee.name='Function']",
          message: 'Do not use the Function constructor.'
        }
      ],
      'no-shadow': 'off',
      'no-underscore-dangle': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' }
      ]
    }
  },
  {
    // tailwindcss/* rules are scoped to the SolidJS component tree rather
    // than every .ts/.tsx in the repo: the rules inspect JSX className
    // usage against client/src/tailwind.config.js, and running them against
    // non-UI files (client/index.ts, root index.ts, .d.ts files) has no
    // effect other than forcing an unnecessary tailwind config resolution.
    files: ['client/src/**/*.ts', 'client/src/**/*.tsx'],
    plugins: {
      tailwindcss: tailwindcssPlugin
    },
    settings: {
      tailwindcss: {
        // Must be an absolute path: the plugin's config loader derives a
        // node-resolution root from path.dirname(config), which silently
        // fails to locate the tailwindcss package when given a cwd-relative
        // path (surfaces as "Could not resolve tailwindcss").
        config: `${projectRoot}client/src/tailwind.config.js`,
        cssFiles: ['client/src/css/**/*.css', '!**/node_modules']
      }
    },
    rules: {
      // eslint-plugin-tailwindcss@3.18.3 (the latest release supporting
      // Tailwind v3, which this project is pinned to — v4 of the plugin
      // requires tailwindcss ^4.0.0) still calls the removed
      // context.getSourceCode() API in classnames-order, which throws under
      // ESLint 10. No ESLint-10-compatible 3.x release exists upstream.
      // Disabled until the plugin ships a fix or this project moves to
      // Tailwind v4.
      'tailwindcss/classnames-order': 'off',
      'tailwindcss/no-contradicting-classname': 'error',
      'tailwindcss/no-custom-classname': 'warn',
      'tailwindcss/no-unnecessary-arbitrary-value': 'warn'
    }
  },
  {
    // eslint-plugin-n's builtin/syntax-support rules cross-check global
    // usage against the package.json `engines.node` range. client/src is
    // browser runtime code that never executes under Node, so browser
    // globals that happen to share a name with newer Node APIs (fetch,
    // navigator, localStorage, crypto, structuredClone, ...) were being
    // misread as unsupported Node builtins.
    files: ['client/src/**/*.ts', 'client/src/**/*.tsx'],
    rules: {
      'n/no-unsupported-features/es-builtins': 'off',
      'n/no-unsupported-features/node-builtins': 'off'
    }
  },
  {
    // SolidJS assigns `ref` bindings (e.g. `<div ref={containerRef}>`)
    // through its JSX compiler, not a visible assignment statement, so
    // no-unassigned-vars can't see the write and flags every ref variable
    // as always-undefined. This is the standard SolidJS ref idiom.
    files: ['client/src/**/*.tsx'],
    rules: {
      'no-unassigned-vars': 'off'
    }
  },
  {
    files: ['client/src/**/*.ts', 'client/src/**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './client/tsconfig.json',
        tsconfigRootDir: projectRoot
      }
    },
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error'
    }
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node
      }
    },
    rules: {
      'n/no-unsupported-features/es-syntax': 'off',
      'n/no-unsupported-features/es-builtins': 'off',
      'n/no-unsupported-features/node-builtins': 'off',
      'no-undef': 'off',
      'no-plusplus': 'off',
      'no-script-url': 'off',
      // Simulation setup values that document intended pre-dismiss state
      // for the reader are legitimately never read before being reset.
      'no-useless-assignment': 'off'
    }
  }
]
