import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
      tailwindcss(),
      Components({
        dts: false,
        resolvers: [AntDesignVueResolver({ importStyle: false, resolveIcons: true })],
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_URL || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.js'],
      globals: true,
      css: false,
      // The first test of a file pays for importing Ant Design; with every file in its
      // own worker that can exceed the 5 s default on a busy machine
      testTimeout: 15000,
      // e2e/ holds the Playwright checks (npm run test:e2e), not unit tests
      include: ['src/**/*.{test,spec}.js'],
      server: {
        deps: {
          inline: ['ant-design-vue'],
        },
      },
    },
  }
})
