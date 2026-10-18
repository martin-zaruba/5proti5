import { describe, it, expect } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'

import HomeScreen from '../HomeScreen.vue'

describe('HomeScreen', () => {
  it('links to all screens', () => {
    const wrapper = mount(HomeScreen, { global: { stubs: { RouterLink: RouterLinkStub } } })
    const targets = wrapper.findAllComponents(RouterLinkStub).map((link) => link.props('to'))
    expect(targets).toEqual(['/moderator', '/board', '/editor'])
  })
})
