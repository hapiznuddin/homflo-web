import { defineVitestProject } from '@nuxt/test-utils/config'
import { defineConfig } from 'vitest/config'

// Tiga project dipisah sesuai kebutuhan:
// - unit  : pure util/config tests, environment node (cepat, tanpa Nuxt runtime)
// - nuxt  : component/page/composable/PWA-head tests dengan Nuxt runtime
//           environment (happy-dom) + auto-import + mountSuspended
// - e2e   : kontrak HTTP production build (spawn .output/server/index.mjs)
const nuxtProject = await defineVitestProject({
  test: {
    name: 'nuxt',
    environment: 'nuxt',
    include: ['test/nuxt/**/*.test.ts'],
    environmentOptions: {
      nuxt: {
        domEnvironment: 'happy-dom'
      }
    },
    testTimeout: 30000,
    hookTimeout: 60000
  }
})

export default defineConfig({
  test: {
    teardownTimeout: 30000,
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['test/unit/**/*.test.ts']
        }
      },
      {
        test: {
          name: 'e2e',
          environment: 'node',
          include: ['test/e2e/**/*.test.ts'],
          testTimeout: 60000,
          hookTimeout: 60000
        }
      },
      nuxtProject
    ]
  }
})
