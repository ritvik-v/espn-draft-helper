import { parseCsv, type Section } from './tiers'

// Avg rank climbs about one per player, so a jump this big marks a tier break at any depth.
const GAP = 2
const MIN_TIER = 3
const MAX_TIER = 12

/** Rankings CSV (Rank, Player, Avg rank) into tiers split at Avg rank gaps; rows without Avg rank use Rank. */
export function parseRankings(csv: string, match: (name: string) => number | null): Section[] {
  const [header, ...rows] = parseCsv(csv.replace(/^﻿/, ''))
  const col = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name)
  const [rank, player, avg] = [col('rank'), col('player'), col('avg rank')]
  if (rank < 0 || player < 0) throw new Error('Rankings CSV needs Rank and Player columns')

  const ranked = rows
    .filter((r) => r[player]?.trim() && Number(r[rank]))
    .map((r) => ({ name: r[player].trim(), at: Number(r[avg]) || Number(r[rank]), rank: Number(r[rank]) }))
    .sort((a, b) => a.rank - b.rank)

  const sections: Section[] = []
  let prev: number | null = null
  for (const p of ranked) {
    const current = sections.at(-1)
    const size = current?.entries.length ?? 0
    if (!current || size >= MAX_TIER || (size >= MIN_TIER && prev !== null && p.at - prev >= GAP))
      sections.push({ id: crypto.randomUUID(), name: `Tier ${sections.length + 1}`, note: null, entries: [] })
    sections.at(-1)!.entries.push({ id: crypto.randomUUID(), playerId: match(p.name), name: p.name, tag: null })
    prev = p.at
  }
  return sections
}
