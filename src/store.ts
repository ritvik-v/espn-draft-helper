import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Cat } from './lib/cats'
import { openPicks, snakeOwners } from './lib/draft'
import type { Basis, League } from './lib/espn'
import type { Section, TierEntry } from './lib/tiers'

export type Pick = { playerId: number; slot: number; overall: number; keeper?: boolean }

export const ownersOf = (s: { pickOwners: number[] | null; teamCount: number; rosterSize: number }) =>
  s.pickOwners ?? snakeOwners(s.teamCount, s.rosterSize)

const defaultNames = (n: number) => Array.from({ length: n }, (_, i) => `Team ${i + 1}`)
const defaultAbbrevs = (n: number) => Array.from({ length: n }, (_, i) => `T${i + 1}`)

type State = {
  teamCount: number
  rosterSize: number
  mySlot: number
  teamNames: string[]
  teamAbbrevs: string[]
  draftDate: number | null
  starters: string[]
  punts: Cat[]
  showTaken: boolean
  /** Imported Hashtag Basketball projections, keyed by ESPN player id. */
  hashtag: { lines: Record<number, Basis>; importedAt: number; unmatched?: string[] } | null
  espn: { leagueId: string; sync: boolean }
  /** Slot owning each overall pick, from ESPN. Null means a plain snake. */
  pickOwners: number[] | null
  /** League the current punts belong to. */
  draftLeague: string | null
  puntsByLeague: Record<string, Cat[]>
  picks: Pick[]
  sections: Section[]
  selectedId: number | null
  tab: Tab
}

export type Tab = 'Tiers' | 'Players' | 'Team' | 'Setup'

type Actions = {
  set: (patch: Partial<State>) => void
  setTeamCount: (n: number) => void
  togglePunt: (c: Cat) => void
  draft: (playerId: number, slot?: number) => void
  undo: () => void
  /** Swaps in that league's punts (none for a new draft) and saves this one's. */
  enterLeague: (leagueId: string) => void
  /** Clears this draft's punts, and hand-entered picks when not synced. Keepers stay. */
  newDraft: () => void
  removePick: (playerId: number) => void
  applyLeague: (league: League, swid: string | null) => void
  updateEntry: (entryId: string, patch: Partial<Omit<TierEntry, 'id'>>) => void
}

type Persisted = Omit<State, 'selectedId' | 'tab'>

export const useDraft = create<State & Actions>()(
  persist<State & Actions, [], [], Persisted>(
    (set, get) => ({
      teamCount: 10,
      rosterSize: 13,
      mySlot: 0,
      teamNames: defaultNames(10),
      teamAbbrevs: defaultAbbrevs(10),
      draftDate: null,
      starters: ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F'],
      punts: [],
      showTaken: false,
      hashtag: null,
      espn: { leagueId: '', sync: true },
      pickOwners: null,
      draftLeague: null,
      puntsByLeague: {},
      picks: [],
      sections: [],
      selectedId: null,
      tab: 'Tiers',

      set: (patch) => set(patch),

      setTeamCount: (n) =>
        set((s) => ({
          teamCount: n,
          mySlot: Math.min(s.mySlot, n - 1),
          teamNames: Array.from({ length: n }, (_, i) => s.teamNames[i] ?? `Team ${i + 1}`),
          teamAbbrevs: Array.from({ length: n }, (_, i) => s.teamAbbrevs[i] ?? `T${i + 1}`),
        })),

      togglePunt: (c) => set((s) => ({ punts: s.punts.includes(c) ? s.punts.filter((p) => p !== c) : [...s.punts, c] })),

      draft: (playerId, slot) => {
        const s = get()
        if (s.picks.some((p) => p.playerId === playerId)) return
        const owners = ownersOf(s)
        const open = openPicks(owners, new Set(s.picks.map((p) => p.overall)))
        // A specific team means "they took him": use that team's next open pick.
        const overall = slot === undefined ? open[0] : open.find((o) => owners[o - 1] === slot)
        if (overall === undefined) return
        set({ picks: [...s.picks, { playerId, slot: owners[overall - 1], overall }] })
      },

      undo: () => set((s) => ({ picks: s.picks.slice(0, -1) })),

      enterLeague: (leagueId) =>
        set((s) =>
          s.draftLeague === leagueId
            ? s
            : {
                puntsByLeague: s.draftLeague ? { ...s.puntsByLeague, [s.draftLeague]: s.punts } : s.puntsByLeague,
                punts: s.puntsByLeague[leagueId] ?? [],
                draftLeague: leagueId,
              },
        ),

      newDraft: () => set((s) => ({ punts: [], picks: s.espn.sync ? s.picks : s.picks.filter((p) => p.keeper) })),

      removePick: (playerId) => set((s) => ({ picks: s.picks.filter((p) => p.playerId !== playerId) })),

      applyLeague: (league, swid) => {
        const order = league.pickOrder
        const byId = new Map(league.teams.map((t) => [t.id, t]))
        const mine = swid ? order.findIndex((id) => byId.get(id)?.owners.includes(swid)) : -1
        set((s) => ({
          teamCount: order.length || s.teamCount,
          rosterSize: league.rosterSize || s.rosterSize,
          teamNames: order.map((id) => byId.get(id)?.name ?? `Team ${id}`),
          teamAbbrevs: order.map((id) => byId.get(id)?.abbrev ?? `T${id}`),
          draftDate: league.draftDate,
          starters: league.starters,
          mySlot: mine >= 0 ? mine : s.mySlot,
          pickOwners: league.owners.length ? league.owners.map((id) => Math.max(0, order.indexOf(id))) : null,
          picks: league.made.map((p) => ({
            playerId: p.playerId,
            slot: Math.max(0, order.indexOf(p.teamId)),
            overall: p.overall,
            keeper: p.keeper,
          })),
        }))
      },

      updateEntry: (entryId, patch) =>
        set((s) => ({
          sections: s.sections.map((x) => ({
            ...x,
            entries: x.entries.map((e) => (e.id === entryId ? { ...e, ...patch } : e)),
          })),
        })),
    }),
    {
      name: 'fhd-draft',
      version: 1,
      // v0 kept ESPN cookies in settings. The extension uses the browser login instead, so drop them.
      migrate: (persisted) => {
        const s = persisted as Persisted
        return { ...s, espn: { leagueId: s.espn.leagueId, sync: s.espn.sync } }
      },
      partialize: ({ selectedId: _, tab: __, ...rest }) => rest,
    },
  ),
)

/** Changes often, so kept out of the persisted store. */
export const useSession = create<{ previewId: number | null; league: { ok: boolean; error: string | null } }>()(() => ({
  previewId: null,
  league: { ok: false, error: null },
}))
