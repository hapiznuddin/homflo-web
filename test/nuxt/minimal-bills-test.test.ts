import { mountSuspended } from '@nuxt/test-utils/runtime'
import { expect, it } from 'vitest'
import BillsPage from '~/pages/bills/index.vue'

it('minimal mount test', async () => {
  const wrapper = await mountSuspended(BillsPage, { route: '/bills' })

  expect(wrapper.exists()).toBe(true)
})
