import js from '@eslint/js'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import importX from 'eslint-plugin-import-x'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

/**
 * 層の境界は .claude/rules/layer-boundaries.md が正。
 * ここはそれを機械的に強制するための写し。片方だけ直さない。
 */
const LAYER_ZONES = [
  {
    target: './src/domain',
    from: './src',
    except: ['./domain'],
    message: 'domain は他の層を import しない',
  },
  {
    target: './src/design-system',
    from: './src',
    except: ['./design-system'],
    message: 'design-system は domain も含め他の層を import しない',
  },
  {
    target: './src/features',
    from: './src',
    except: ['./domain', './design-system', './features', './fixtures'],
    message: 'features が import してよいのは domain と design-system',
  },
  {
    target: './src/pages',
    from: './src',
    except: ['./features', './design-system/layouts', './pages'],
    message: 'pages が import してよいのは features と design-system/layouts',
  },
  {
    target: './src/fixtures',
    from: './src',
    except: ['./domain/models', './fixtures'],
    message: 'fixtures が import してよいのは domain/models だけ',
  },
]

const NO_CSS_IMPORT = {
  patterns: [
    {
      group: ['*.css', '*.scss'],
      message: 'CSS は design-system 側で持つ',
    },
  ],
}

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      '.wrangler/**',
      'storybook-static/**',
      'coverage/**',
      'worker-configuration.d.ts', // wrangler types の生成物
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'import-x': importX },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({ alwaysTryTypes: true }),
      ],
    },
    rules: {
      'import-x/no-restricted-paths': ['error', { zones: LAYER_ZONES }],
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc' },
        },
      ],
    },
  },

  // domain: ロジックだけの世界
  {
    files: ['src/domain/**/*.ts'],
    languageOptions: {
      globals: {}, // window / document / fetch を含む DOM グローバルを一切与えない
    },
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'domain は DOM を触らない' },
        { name: 'document', message: 'domain は DOM を触らない' },
        { name: 'fetch', message: 'domain は I/O を持たない' },
      ],
      'no-restricted-imports': ['error', NO_CSS_IMPORT],
    },
  },

  // domain に .tsx を置かせない。存在するだけで落とす
  {
    files: ['src/domain/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Program',
          message: 'domain に .tsx は置けない。JSX が必要ならその処理は features に属する',
        },
      ],
    },
  },

  // design-system: 見た目だけの世界。副作用を持たない
  {
    files: ['src/design-system/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'design-system は props のみで完結する' },
      ],
    },
  },

  // features / pages: 見た目の調整は design-system 側の variant prop でやる
  {
    files: ['src/features/**/*.tsx', 'src/pages/**/*.tsx'],
    rules: {
      'no-restricted-imports': ['error', NO_CSS_IMPORT],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXAttribute[name.name="className"]',
          message: 'className を書かない。design-system 側に variant prop を足す',
        },
        {
          selector: 'JSXAttribute[name.name="style"]',
          message: 'style 属性を書かない。design-system 側に variant prop を足す',
        },
      ],
    },
  },

  {
    files: ['src/**/*.tsx'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      globals: globals.browser,
    },
    rules: reactHooks.configs.recommended.rules,
  },

  {
    files: ['worker/**/*.ts'],
    languageOptions: {
      globals: globals.worker,
    },
  },

  {
    files: ['*.config.{ts,js}'],
    languageOptions: {
      globals: globals.node,
    },
  },
)
