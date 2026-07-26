import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Storybook 専用の Vite 設定。
 *
 * リポジトリ直下の vite.config.ts を読ませないために置いている。あれを読ませると
 * @cloudflare/vite-plugin ごと Storybook に入り、wrangler.jsonc の内容で
 * Storybook が壊れる余地ができる。Storybook が映すのは props だけで完結する
 * design-system なので、Worker も D1 も要らない。
 *
 * react() は省略できない。@storybook/react-vite が viteFinal で足すのは
 * docgen のプラグインだけで、@vitejs/plugin-react 自体は含まれない。
 * 省くと JSX は変換されるが Fast Refresh が効かなくなる。
 */
export default defineConfig({ plugins: [react()] })
