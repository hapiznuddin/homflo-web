import { mountSuspended } from '@nuxt/test-utils/runtime'
import { expect, it } from 'vitest'
import ListsPage from '~/pages/lists/index.vue'

it('minimal mount test', async () => {
  const wrapper = await mountSuspended(ListsPage, { route: '/lists' })

  expect(wrapper.exists()).toBe(true)
})
