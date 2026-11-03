import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import eslintConfigPrettier from 'eslint-config-prettier/flat'

export default [
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.{js,mjs,cjs,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ['**/*.vue'],
    rules: {
      // Project rule: Vue components use the Options API only
      'vue/component-api-style': ['error', ['options']],
    },
  },
  {
    files: ['src/**/*.{js,vue}'],
    rules: {
      // Project rule: store state is read through getters (mapGetters), never mapState
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'vuex',
              importNames: ['mapState'],
              message: 'Add a getter to the module and use mapGetters instead.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['vite.config.js', 'eslint.config.js', 'playwright.config.js', 'e2e/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['src/**/__tests__/**/*.{js,vue}', 'src/**/*.{spec,test}.js'],
    languageOptions: {
      globals: {
        ...globals.vitest,
      },
    },
  },
  // Must stay last: turns off every ESLint rule that conflicts with Prettier
  eslintConfigPrettier,
]
