import { describe, expect, it } from 'vitest'
import { nowScores } from './now'

describe('nowScores', () => {
  it('prefers the player who will be gone over a better one who will be back', () => {
    const fit = new Map([[1, 1], [2, 0.8]])
    const p: Record<number, number> = { 1: 0.9, 2: 0 }
    const now = nowScores(fit, (id) => p[id])
    expect(now.get(1)).toBeCloseTo(0.1)
    expect(now.get(2)).toBeCloseTo(0.8)
  })

  it('is plain fit when nobody lasts to the next pick', () => {
    const now = nowScores(new Map([[1, 0.5], [2, 0.3]]), () => 0)
    expect(now.get(1)).toBeCloseTo(0.5)
    expect(now.get(2)).toBeCloseTo(0.3)
  })

  it('treats players without a next-pick chance as gone', () => {
    expect(nowScores(new Map([[1, 0.4]]), () => null).get(1)).toBeCloseTo(0.4)
  })
})
