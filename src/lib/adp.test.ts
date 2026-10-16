import { describe, expect, it } from 'vitest'
import { blendAdp } from './adp'

describe('blendAdp', () => {
  it('weights ESPN double', () => expect(blendAdp(10, 40)).toBe(20))
  it('counts off ESPN\'s board as a late pick', () => {
    expect(blendAdp(140, 135)).toBe(145)
    expect(blendAdp(140, 200)).toBe(200)
  })
  it('uses whichever source has him', () => {
    expect(blendAdp(50, undefined)).toBe(50)
    expect(blendAdp(null, 60)).toBe(60)
  })
  it('is null when nobody drafts him', () => expect(blendAdp(140, undefined)).toBeNull())
})
