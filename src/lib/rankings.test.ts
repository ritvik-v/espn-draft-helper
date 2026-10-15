import { describe, expect, it } from 'vitest'
import { parseRankings } from './rankings'

const csv = (avgs: (number | '')[]) =>
  ['﻿Rank,Player,Pos,Team,Avg rank', ...avgs.map((a, i) => `${i + 1},P${i + 1},C,DEN,${a}`)].join('\n')
const sizes = (avgs: (number | '')[]) => parseRankings(csv(avgs), () => null).map((s) => s.entries.length)

describe('parseRankings', () => {
  it('breaks tiers at Avg rank gaps of 2 or more', () => {
    expect(sizes([1, 2, 3, 6, 7, 8, 9, 12, 13, 14])).toEqual([3, 4, 3])
  })

  it('keeps tiers at least 3 deep and at most 12', () => {
    expect(sizes([1, 5, 9, 13])).toEqual([3, 1])
    expect(sizes(Array.from({ length: 14 }, (_, i) => i + 1))).toEqual([12, 2])
  })

  it('falls back to Rank without an Avg rank and keeps names with their matched ids', () => {
    const [tier] = parseRankings(csv([1, '', 3]), (name) => (name === 'P2' ? 7 : null))
    expect(tier.name).toBe('Tier 1')
    expect(tier.entries.map((e) => [e.name, e.playerId])).toEqual([['P1', null], ['P2', 7], ['P3', null]])
  })
})
