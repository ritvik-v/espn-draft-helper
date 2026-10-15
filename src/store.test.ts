import { beforeEach, describe, expect, it } from 'vitest'
import { useDraft } from './store'

beforeEach(() => useDraft.setState(useDraft.getInitialState(), true))

describe('draft resets', () => {
  it('gives each league its own punts', () => {
    const { enterLeague, togglePunt } = useDraft.getState()
    enterLeague('real')
    togglePunt('to')
    enterLeague('real')
    expect(useDraft.getState().punts).toEqual(['to'])
    enterLeague('mock')
    expect(useDraft.getState().punts).toEqual([])
    togglePunt('ft')
    enterLeague('real')
    expect(useDraft.getState().punts).toEqual(['to'])
    enterLeague('mock')
    expect(useDraft.getState().punts).toEqual(['ft'])
  })

  it('a new draft clears punts, and hand-entered picks only when not synced', () => {
    const picks = [{ playerId: 1, slot: 0, overall: 1 }, { playerId: 2, slot: 1, overall: 12, keeper: true }]
    useDraft.setState({ punts: ['ft'], picks })
    useDraft.getState().newDraft()
    expect(useDraft.getState().punts).toEqual([])
    expect(useDraft.getState().picks).toEqual(picks)

    useDraft.setState({ punts: ['ft'], picks, espn: { leagueId: '', sync: false } })
    useDraft.getState().newDraft()
    expect(useDraft.getState().picks.map((p) => p.playerId)).toEqual([2])
  })
})
