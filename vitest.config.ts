import { defineConfig } from 'vitest/config'

// vite.config.ts と分けているのは、@cloudflare/vite-plugin が Worker 環境に
// resolve.external を許さず、Vitest が Node 組み込みを外部化するのと衝突するため。
// worker/** のテストが必要になったら @cloudflare/vitest-pool-workers を別 project として足す。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
