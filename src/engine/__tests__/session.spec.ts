import { describe, it, expect } from 'vitest'

import { toBoardView } from '../boardView'
import { GameError } from '../game'
import { canUndo, dispatch, HISTORY_LIMIT, undo } from '../session'
import {
  A,
  B,
  buzz,
  clearRound,
  makeSet,
  newSession,
  next,
  reveal,
  run,
  takeControl,
  wrong,
} from './helpers'

describe('undo (T-004)', () => {
  it('restores exactly the previous state', () => {
    const before = run(newSession(), ...takeControl(A))
    const after = run(before, reveal(2))
    const undone = undo(after)
    expect(undone.state).toBe(before.state)
    expect(undone.state).toEqual(before.state)
  })

  it('can be repeated back to the start of the game', () => {
    const start = newSession()
    let s = run(start, ...takeControl(A), wrong, wrong)
    while (canUndo(s)) s = undo(s)
    expect(s.state).toEqual(start.state)
  })

  it('does nothing when there is no history', () => {
    const s = newSession()
    expect(canUndo(s)).toBe(false)
    expect(undo(s)).toBe(s)
  })

  it('undoes an automatic steal transition and round award as one step', () => {
    const steal = run(newSession(), ...takeControl(A), wrong, wrong, wrong)
    const ended = run(steal, reveal(2))
    expect(ended.state.teams[1].score).toBe(30)
    expect(undo(ended).state).toEqual(steal.state)
  })

  it('keeps at most HISTORY_LIMIT states', () => {
    let s = run(newSession(), next, buzz(A))
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) {
      s = run(s, { type: 'setShowQuestion', show: i % 2 === 0 })
    }
    expect(s.past).toHaveLength(HISTORY_LIMIT)
  })
})

describe('event log (T-004)', () => {
  it('records actions with their consequences and undo', () => {
    let s = run(newSession(), next, buzz(B), reveal(3), reveal(1))
    s = undo(s)
    const texts = s.log.map((e) => e.text)
    expect(texts[0]).toMatch(/^Nová hra: Modrí vs\. Červení/)
    expect(texts).toContain('Tlačidlo prvé stlačilo družstvo Červení')
    expect(texts).toContain(
      'Odkrytá odpoveď č. 1 „Kolo 1 – odpoveď 1“ (+30 b.); kontrolu získava Modrí',
    )
    expect(texts.at(-1)).toBe(
      '↶ Vrátené: Odkrytá odpoveď č. 1 „Kolo 1 – odpoveď 1“ (+30 b.); kontrolu získava Modrí',
    )
  })

  it('records the round result', () => {
    const s = run(newSession(), ...takeControl(A), wrong, wrong, wrong, reveal(2))
    expect(s.log.at(-1)?.text).toBe(
      'Odkrytá odpoveď č. 2 „Kolo 1 – odpoveď 2“ (bez bodov); krádež úspešná – bank 30 b. získava Červení',
    )
  })

  it('stamps entries with the given time', () => {
    const s = dispatch(newSession(), next, new Date('2026-10-18T12:34:56Z'))
    expect(s.log.at(-1)?.at).toBe('2026-10-18T12:34:56.000Z')
  })

  it('leaves the session untouched when an action is rejected', () => {
    const s = newSession()
    expect(() => dispatch(s, wrong)).toThrow(GameError)
    expect(s.log).toHaveLength(1)
    expect(s.past).toHaveLength(0)
  })
})

describe('voiding a question (§8, T-004)', () => {
  it('restores the score from before the question and replays the same round with a reserve', () => {
    let s = run(newSession(), ...clearRound(A))
    s = run(s, ...clearRound(B))
    expect(s.state.teams.map((t) => t.score)).toEqual([100, 100])
    s = run(s, { type: 'voidQuestion' })
    expect(s.state.teams.map((t) => t.score)).toEqual([100, 0])
    expect(s.state.phase).toBe('faceOff')
    expect(s.state.round?.number).toBe(2)
    expect(s.state.round?.replay).toBe('void')
    expect(s.state.round?.question.text).toBe('Rezerva 1')
    expect(s.state.round?.bank).toBe(0)
  })

  it('works in the middle of a round and uses reserves in order', () => {
    let s = run(newSession(), ...takeControl(A), wrong, { type: 'voidQuestion' })
    expect(s.state.round?.strikes).toBe(0)
    s = run(s, buzz(B), { type: 'voidQuestion' })
    expect(s.state.round?.question.text).toBe('Rezerva 2')
    expect(s.state.reserveUsed).toBe(2)
  })

  it('is not possible before the first round or without reserves', () => {
    expect(() => dispatch(newSession(), { type: 'voidQuestion' })).toThrow(GameError)
    const s = run(newSession(makeSet(0)), next)
    expect(() => dispatch(s, { type: 'voidQuestion' })).toThrow('Došli však rezervné otázky')
  })
})

describe('manual score correction (T-004)', () => {
  it('adjusts the score and logs it', () => {
    const s = run(newSession(), { type: 'adjustScore', team: B, delta: 15 })
    expect(s.state.teams[1].score).toBe(15)
    expect(s.log.at(-1)?.text).toBe('Ručná korekcia: Červení +15 → 15 b.')
  })

  it('rejects a zero or fractional correction', () => {
    expect(() => dispatch(newSession(), { type: 'adjustScore', team: A, delta: 0 })).toThrow(
      GameError,
    )
    expect(() => dispatch(newSession(), { type: 'adjustScore', team: A, delta: 1.5 })).toThrow(
      GameError,
    )
  })
})

describe('board view (T-008)', () => {
  it('never contains hidden answers', () => {
    const s = run(newSession(), ...takeControl(A), reveal(3))
    const view = toBoardView(s.state)
    const json = JSON.stringify(view)
    expect(json).toContain('Kolo 1 – odpoveď 1')
    expect(json).toContain('Kolo 1 – odpoveď 3')
    for (const hidden of [2, 4, 5]) expect(json).not.toContain(`odpoveď ${hidden}`)
    expect(view.round?.slots.map((slot) => slot.answer?.points ?? null)).toEqual([
      30,
      null,
      20,
      null,
      null,
    ])
  })

  it('hides the question text when requested', () => {
    let s = run(newSession(), next)
    expect(toBoardView(s.state).round?.question).toBe('Kolo 1')
    s = run(s, { type: 'setShowQuestion', show: false })
    expect(toBoardView(s.state).round?.question).toBeNull()
  })

  it('marks answers revealed at the end of the round as not scored', () => {
    const s = run(newSession(), ...takeControl(A), wrong, wrong, wrong, wrong, {
      type: 'revealRemaining',
    })
    const slots = toBoardView(s.state).round!.slots
    expect(slots.map((slot) => slot.answer?.scored)).toEqual([true, false, false, false, false])
  })

  it('shows the team that is playing', () => {
    const s = run(newSession(), ...takeControl(B), wrong, wrong, wrong)
    expect(toBoardView(s.state).round?.activeTeam).toBe(A)
  })
})
