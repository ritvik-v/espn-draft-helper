import { useQuery } from '@tanstack/react-query'
import { createContext, use, useCallback, useMemo, type ReactNode } from 'react'
import { CATS, type Cat, type CatLine } from './lib/cats'
import { blendAdp, fetchFantraxAdp } from './lib/adp'
import { availability, calibration, openPicks } from './lib/draft'
import { nowScores } from './lib/now'
import { puntAdvice } from './lib/punt'
import { fetchPlayers, type Player } from './lib/espn'
import { openSlots } from './lib/slots'
import type { Section, TierEntry } from './lib/tiers'
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
  const { teamCount, rosterSize, mySlot, punts, picks, sections, pickOwners, starters } = useDraft()
  const basis = hashtag ? 'hashtag' : 'proj'

  const poolSize = teamCount * rosterSize
  const { valued, swing } = useMemo(
    () => valuePlayers(players.data ?? [], { basis, totals: false, punts, poolSize }),
    [players.data, basis, punts, poolSize],
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
    // You decide at your upcoming pick, so the question is whether he lasts from there to the one after.
    return { drafted, byPick, owners, currentPick, onClock, mine, target: mine[1] ?? null, from: mine[0] ?? currentPick }
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

  const puntTips = useMemo(() => {
    const mine = teams.strengths[mySlot]
    if (!mine) return []
    return puntAdvice({
      mine,
      opponents: teams.strengths.filter((_, i) => i !== mySlot),
      topAvailable: teams.available.slice(0, 20).map((v) => v.z),
      punts,
      rosterCount: teams.rosters[mySlot]?.length ?? 0,
      scale: teams.winScale,
    })
  }, [teams, mySlot, punts])

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

  // Per-player ADP odds alone undercount how many go between your picks, so scale them to the real count.
  const oddsPower = useMemo(() => {
    if (draft.target === null) return 1
    const adps = [...allPlayers.values()].flatMap((p) => (p.adp === null || draft.drafted.has(p.id) ? [] : [p.adp]))
    const toFrom = adps.map((adp) => availability(adp, draft.currentPick, draft.from))
    const reachPower = calibration(toFrom.map((lasts) => ({ reach: 1, lasts })), draft.from - draft.currentPick)
    const board = adps.map((adp, i) => ({ reach: toFrom[i] ** reachPower, lasts: availability(adp, draft.from, draft.target!) }))
    return calibration(board, draft.target - draft.from - 1)
  }, [allPlayers, draft])

  const availAtTarget = useCallback(
    (id: number) => {
      const p = allPlayers.get(id)
      if (!p || draft.drafted.has(id) || draft.target === null) return null
      return p.adp === null ? 1 : availability(p.adp, draft.from, draft.target) ** oddsPower
    },
    [allPlayers, draft, oddsPower],
  )

  const now = useMemo(() => nowScores(teams.fit, availAtTarget), [teams.fit, availAtTarget])
  // Fit equals value on an empty roster, so Now leads from the third pick.
  const nowFirst = (teams.rosters[mySlot]?.length ?? 0) >= 2
  const nowMax = Math.max(0, ...now.values())
  const topNow = useMemo(
    () => new Set([...now].filter(([id]) => tiersByPlayer.has(id)).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id)),
    [now, tiersByPlayer],
  )

  return { players, allPlayers, valued, byId, draft, teams, now, nowFirst, nowMax, ranks, puntTips, slots, topNow, tiersByPlayer, availAtTarget, cats: activeCats(punts) }
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
