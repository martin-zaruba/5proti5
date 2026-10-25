import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import type { ConnectionStatus } from '@/shared/sync/protocol'
import type { ClosedReason, WebSocketTransportOptions } from '@/shared/sync/webSocketTransport'

import BoardScreen from '../board/BoardScreen.vue'

/** Status the fake room connection reports; rooms the board tried to join. */
const fake = vi.hoisted(() => ({
  status: 'online' as ConnectionStatus,
  reason: null as ClosedReason | null,
  joined: [] as string[],
}))

vi.mock('@/shared/sync/config', () => ({ syncServerUrl: 'https://sync.test' }))
vi.mock('@/shared/sync/webSocketTransport', () => ({
  createWebSocketTransport(options: WebSocketTransportOptions) {
    fake.joined.push(options.roomCode)
    return {
      closedReason: fake.reason,
      send() {},
      subscribe: () => () => {},
      onStatus(listener: (s: ConnectionStatus) => void) {
        listener(fake.status)
        return () => {}
      },
      clockOffset: () => 0,
      close() {},
    }
  },
}))

async function mountBoard(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/board', component: BoardScreen }],
  })
  await router.push(path)
  const wrapper = mount(BoardScreen, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('BoardScreen rooms', () => {
  it('joins a room by a typed code', async () => {
    fake.joined = []
    const { wrapper, router } = await mountBoard('/board')
    expect(fake.joined).toEqual([])

    await wrapper.find('#room-code').setValue('abc 0ef')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.text()).toContain('Kód má 6 písmen a číslic')

    await wrapper.find('#room-code').setValue('abc-def')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(router.currentRoute.value.query.room).toBe('ABCDEF')
    expect(fake.joined).toEqual(['ABCDEF'])
    expect(wrapper.text()).toContain('miestnosť ABCDEF')
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('tells when the room does not exist and offers another code', async () => {
    fake.status = 'closed'
    fake.reason = 'roomNotFound'
    const { wrapper } = await mountBoard('/board?room=ABCDEF')
    expect(wrapper.find('[role="alert"]').text()).toContain('Miestnosť neexistuje')
    expect(wrapper.find('#room-code').exists()).toBe(true)
    fake.status = 'online'
    fake.reason = null
  })
})
