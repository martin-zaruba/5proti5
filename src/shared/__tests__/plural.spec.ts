import { describe, it, expect } from 'vitest'

import { plural } from '../plural'

describe('plural', () => {
  it('uses Slovak plural forms', () => {
    const errors = (n: number) => `${n} ${plural(n, 'chyba', 'chyby', 'chýb')}`
    expect([0, 1, 2, 4, 5, 36].map(errors)).toEqual([
      '0 chýb',
      '1 chyba',
      '2 chyby',
      '4 chyby',
      '5 chýb',
      '36 chýb',
    ])
  })
})
