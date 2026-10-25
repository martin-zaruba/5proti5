import { mount, RouterLinkStub } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'

import { useGameStore } from '@/shared/gameStore'

import SetupForm from '../moderator/SetupForm.vue'

const mountForm = () => mount(SetupForm, { global: { stubs: { RouterLink: RouterLinkStub } } })

describe('SetupForm team size (T-021)', () => {
  beforeEach(() => {
    localStorage.clear()
    useGameStore().endGame()
  })

  it('shows as many positions as chosen, the captain last, and starts the game with them', async () => {
    const wrapper = mountForm()
    expect(wrapper.findAll('fieldset')[0]!.findAll('input:not([class*="text-lg"])')).toHaveLength(5)

    await wrapper.find('select').setValue('3')
    const team = wrapper.findAll('fieldset')[0]!
    const players = team.findAll('input:not([class*="text-lg"])')
    expect(players).toHaveLength(3)
    expect(team.text()).toMatch(/Pozícia 3\s*kapitán/)
    expect(wrapper.text()).toContain('pozíciách 1, 2, 3, 1, 2')

    await players[0]!.setValue('Anna')
    await wrapper.find('button.bg-amber-400').trigger('click')
    const state = useGameStore().state.value!
    expect(state.teams[0].players).toEqual(['Anna', 'Hráč 2', 'Hráč 3'])
    expect(state.teams[1].players).toHaveLength(3)
  })

  it('remembers the size and keeps the names of hidden positions', async () => {
    const first = mountForm()
    await first.findAll('fieldset')[0]!.findAll('input')[5]!.setValue('Piaty')
    await first.find('select').setValue('2')
    first.unmount()

    const again = mountForm()
    expect((again.find('select').element as HTMLSelectElement).value).toBe('2')
    await again.find('select').setValue('5')
    expect(
      (again.findAll('fieldset')[0]!.findAll('input')[5]!.element as HTMLInputElement).value,
    ).toBe('Piaty')
  })
})
