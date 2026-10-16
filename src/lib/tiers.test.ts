import { describe, expect, it } from 'vitest'
import { nameMatcher } from './tiers'

const players = [
  { id: 1, name: 'Stephen Curry' },
  { id: 2, name: 'Jaren Jackson Jr.' },
  { id: 3, name: "Kel'el Ware" },
  { id: 4, name: 'Cade Cunningham' },
  { id: 5, name: 'Seth Curry' },
  { id: 6, name: 'Nikola Jokić' },
]
const match = nameMatcher(players)

describe('nameMatcher', () => {
  it('matches across punctuation, suffixes, accents and nicknames', () => {
    expect(match('Jaren Jackson Jr')).toBe(2)
    expect(match('Kelel Ware')).toBe(3)
    expect(match('Nikola Jokic')).toBe(6)
    expect(match('Steph Curry')).toBe(1)
  })

  it('refuses ambiguous or unknown names', () => {
    expect(match('S Curry')).toBeNull()
    expect(match('Nobody Atall')).toBeNull()
  })
})

