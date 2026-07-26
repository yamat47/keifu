import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  framework: {
    name: '@storybook/react-vite',
    // 直下の vite.config.ts を読ませない → .storybook/vite.config.ts の先頭コメント
    options: { builder: { viteConfigPath: '.storybook/vite.config.ts' } },
  },

  // ストーリーを置くのは design-system 配下だけ
  // → docs/design/design-system.md「Storybook」
  stories: ['../src/design-system/**/*.stories.tsx'],
}

export default config
