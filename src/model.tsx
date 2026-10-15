import { useQuery } from '@tanstack/react-query'
import { createContext, use, useCallback, useMemo, type ReactNode } from 'react'
import { CATS, type Cat, type CatLine } from './lib/cats'
import { blendAdp, fetchFantraxAdp } from './lib/adp'
import { availability, openPicks } from './lib/draft'
import { nowScores } from './lib/now'
import { fetchPlayers, type Player } from './lib/espn'
import { openSlots } from './lib/slots'
import { entryRange, type Section, type TierEntry } from './lib/tiers'
import { activeCats, fitScores, replacementLevel, teamStrength, valuePlayers, winScales, type Valued } from './lib/value'
import { ownersOf, useDraft } from './store'

export type TierRef = { section: Section; entry: TierEntry }

const FIT_CANDIDATES = 250

function useBuildModel() {
  const espn = useQuery({ queryKey: ['players'], queryFn: fetchPlayers, staleTime: 60 * 60 * 1000 })
  const fantrax = useQuery({
    queryKey: ['fantrax-adp'],
    queryFn: () => fetchFantraxAdp(espn.data ?? []),
    enabled: !!espn.data,
    staleTime: 60 * 60 * 1000,
  })
  const hashtag = useDraft((s) => s.hashtag)
  // ESPN ADP alone if Fantrax is down; ESPN projections for anyone the Hashtag CSV lacks.
  const data = useMemo(
    (): Player[] | undefined =>
      espn.data?.map((p) => ({ ...p, adp: blendAdp(p.adp, fantrax.data?.get(p.id)), hashtag: hashtag ? (hashtag.lines[p.id] ?? p.proj) : null })),
    [espn.data, fantrax.data, hashtag],
  )
  const players = { ...espn, data }
  const { teamCount, rosterSize, mySlot, punts, basis, totals, picks, sections, pickOwners, starters } = useDraft()

  const poolSize = teamCount * rosterSize
  const { valued, swing } = useMemo(
    () => valuePlayers(players.data ?? [], { basis, totals, punts, poolSize }),
    [players.data, basis, totals, punts, poolSize],
  )
  const byId = useMemo(() => new Map(valued.map((v) => [v.player.id, v])), [valued])
  const allPlayers = useMemo(() => new Map((players.data ?? []).map((p) => [p.id, p])), [players.data])

  const draft = useMemo(() => {
    const drafted = new Map(picks.map((p) => [p.playerId, { slot: p.slot, pick: p.overall, keeper: !!p.keeper }]))
    const byPick = new Map(picks.map((p) => [p.overall, p]))
    const owners = ownersOf({ pickOwners, teamCount, rosterSize })
    const open = openPicks(owners, new Set(byPick.keys()))
    const currentPick = open[0] ?? owners.length + 1
    const onClock = open.length ? owners[currentPick - 1] : null
    const mine = open.filter((o) => owners[o - 1] === mySlot)
    // When I'm on the clock, the useful question is whether a player lasts to my *following* pick.
    const target = onClock === mySlot ? mine[1] : mine[0]
    return { drafted, byPick, owners, currentPick, onClock, mine, target: target ?? null }
  }, [picks, pickOwners, teamCount, rosterSize, mySlot])

  const teams = useMemo(() => {
    const replacement = replacementLevel(valued, poolSize)
    const winScale = winScales(swing, rosterSize)
    const rosters: Valued[][] = Array.from({ length: teamCount }, () => [])
    for (const p of picks) {
      const v = byId.get(p.playerId)
      if (v && rosters[p.slot]) rosters[p.slot].push(v)
    }
    const strengths: CatLine[] = rosters.map((r) => teamStrength(r.map((v) => v.z), rosterSize, replacement))
    const available = valued.filter((v) => !draft.drafted.has(v.player.id))
    const fit = fitScores(
      available.slice(0, FIT_CANDIDATES),
      (rosters[mySlot] ?? []).map((v) => v.z),
      strengths.filter((_, i) => i !== mySlot),
      rosterSize,
      replacement,
      activeCats(punts),
      winScale,
    )
    return { rosters, strengths, available, fit, replacement, winScale }
  }, [valued, swing, byId, picks, teamCount, rosterSize, mySlot, poolSize, punts, draft])

  // My category ranks now, and what they'd be with a given player added.
  const ranks = useMemo(() => {
    const others = teams.strengths.filter((_, i) => i !== mySlot)
    const rankOf = (team: CatLine) =>
      Object.fromEntries(CATS.map((c) => [c, 1 + others.filter((o) => o[c] > team[c]).length])) as Record<Cat, number>
    const mineZ = (teams.rosters[mySlot] ?? []).map((v) => v.z)
    const now = teams.strengths[mySlot] ? rankOf(teams.strengths[mySlot]) : null
    const withPlayer = (id: number) => {
      const v = byId.get(id)
      return v ? rankOf(teamStrength([...mineZ, v.z], rosterSize, teams.replacement)) : null
    }
    return { now, withPlayer, teams: teams.strengths.length }
  }, [teams, mySlot, byId, rosterSize])

  // Starting slots my roster can't fill yet. Once my remaining picks only just cover them, a player who
  // fills none of them costs a starter.
  const slots = useMemo(() => {
    const roster = (teams.rosters[mySlot] ?? []).map((v) => v.player.pos.split('/'))
    const open = openSlots(starters, roster)
    const tight = open.length > 0 && draft.mine.length <= open.length
    const fills = (pos: string) => openSlots(starters, [...roster, pos.split('/')]).length < open.length
    return { open, tight, fills }
  }, [teams.rosters, mySlot, starters, draft.mine.length])

  const tiersByPlayer = useMemo(() => {
    const out = new Map<number, TierRef[]>()
    for (const section of sections)
      for (const entry of section.entries)
        if (entry.playerId !== null) out.set(entry.playerId, [...(out.get(entry.playerId) ?? []), { section, entry }])
    return out
  }, [sections])


  const availAtTarget = useCallback(
    (id: number) => {
      const p = allPlayers.get(id)
      if (!p || draft.drafted.has(id) || draft.target === null) return null
      return p.adp === null ? 1 : availability(p.adp, draft.currentPick, draft.target)
    },
    [allPlayers, draft],
  )

  const now = useMemo(() => nowScores(teams.fit, availAtTarget), [teams.fit, availAtTarget])
  // Fit equals value on an empty roster, so Now leads from the third pick.
  const nowFirst = (teams.rosters[mySlot]?.length ?? 0) >= 2
  const nowMax = Math.max(0, ...now.values())
  const topNow = useMemo(
    () => new Set([...now].filter(([id]) => tiersByPlayer.has(id)).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id)),
    [now, tiersByPlayer],
  )

  // The take-now-or-wait read on your buckets.
  const outlook = useMemo(() => {
    const isOpen = (e: TierEntry) => e.playerId === null || !draft.drafted.has(e.playerId)
    // Players whose sheet range ("40-55", "35+") starts after your pick stay listed, since you can still take
    // them early, but don't count toward what's left or "take one now".
    const pick = draft.mine[0] ?? draft.currentPick
    const inPlay = (s: Section, e: TierEntry) => isOpen(e) && (entryRange(s, e)?.from ?? 0) <= pick
    const live = sections.filter((s) => s.entries.some((e) => inPlay(s, e)))
    // How many of each bucket should still be on the board at your next pick.
    const expected = new Map(
      sections.map((s) => {
        const ids = new Set(s.entries.flatMap((e) => (e.playerId !== null && inPlay(s, e) ? [e.playerId] : [])))
        return [s.id, draft.target && ids.size ? [...ids].reduce((n, id) => n + (availAtTarget(id) ?? 0), 0) : null] as const
      }),
    )
    // Near your pick: the highest bucket that won't last, and the top buckets you're choosing from.
    const soon = draft.onClock === mySlot || (draft.mine[0] ?? Infinity) - draft.currentPick <= 2
    const lastChance = soon ? live.find((s) => (expected.get(s.id) ?? Infinity) < 1)?.id : undefined
    const waitBuckets = new Set(soon ? live.slice(0, 2).map((s) => s.id) : [])
    const canWait = (sectionId: string, playerId: number) => waitBuckets.has(sectionId) && (availAtTarget(playerId) ?? 0) >= 0.7
    return { isOpen, inPlay, pick, live, current: live[0]?.id, expected, soon, lastChance, waitBuckets, canWait }
  }, [sections, draft, availAtTarget, mySlot])

  return { players, allPlayers, valued, byId, draft, teams, now, nowFirst, nowMax, ranks, slots, topNow, tiersByPlayer, outlook, availAtTarget, cats: activeCats(punts) }
}

export type Model = ReturnType<typeof useBuildModel>

const ModelContext = createContext<Model | null>(null)

export function ModelProvider({ children }: { children: ReactNode }) {
  return <ModelContext value={useBuildModel()}>{children}</ModelContext>
}

export const useModel = () => {
  const m = use(ModelContext)
  if (!m) throw new Error('useModel outside ModelProvider')
  return m
}
