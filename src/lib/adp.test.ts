import { describe, expect, it } from 'vitest'
import { blendAdp } from './adp'

describe('blendAdp', () => {
  it('weights ESPN double', () => expect(blendAdp(10, 40)).toBe(20))
  it('ignores ESPN undrafted placeholders', () => expect(blendAdp(140, 200)).toBe(200))
  it('uses whichever source drafts him', () => expect(blendAdp(50, undefined)).toBe(50))
  it('is null when nobody drafts him', () => expect(blendAdp(140, undefined)).toBeNull())
})
