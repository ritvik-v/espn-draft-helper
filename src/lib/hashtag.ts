import type { Basis } from './espn'
import { nameMatcher, parseCsv } from './tiers'

/** "0.573\n(10.5/18.3)" → made and attempted per game. */
const shooting = (cell: string) => {
  const m = cell.match(/\(\s*([\d.]+)\s*\/\s*([\d.]+)\s*\)/)
  return m ? { made: Number(m[1]), att: Number(m[2]) } : null
}

/** Hashtag projections (Z Score off) as per-game lines by ESPN id; rows without a leading rank are repeated headers. */
export function parseHashtag(csv: string, players: { id: number; name: string }[]) {
  const [header, ...rows] = parseCsv(csv.replace(/^﻿/, ''))
  const col = (name: string) => {
    const i = header.findIndex((h) => h.trim().toUpperCase() === name)
    if (i < 0) throw new Error(`Hashtag CSV has no ${name} column`)
    return i
  }
  const c = {
    rank: col('R#'), name: col('PLAYER'), gp: col('GP'), min: col('MPG'), fg: col('FG%'), ft: col('FT%'),
    tpm: col('3PM'), pts: col('PTS'), reb: col('TREB'), ast: col('AST'), stl: col('STL'), blk: col('BLK'), to: col('TO'),
  }
  const match = nameMatcher(players)
  const lines: Record<number, Basis> = {}
  const unmatched: string[] = []
  for (const row of rows) {
    if (!/^\d+\b/.test(row[c.rank]?.trim() ?? '')) continue
    const fg = shooting(row[c.fg])
    const ft = shooting(row[c.ft])
    const name = row[c.name].trim()
    if (!fg || !ft) throw new Error(`${name}: FG% and FT% need makes/attempts. Export with Z Score off`)
    const id = match(name)
    // Rows run best first, so a second name landing on the same player is the weaker match.
    if (id === null || lines[id]) {
      unmatched.push(name)
      continue
    }
    const n = (i: number) => Number(row[i]) || 0
    lines[id] = {
      gp: n(c.gp),
      min: n(c.min),
      stats: {
        pts: n(c.pts), reb: n(c.reb), ast: n(c.ast), stl: n(c.stl), blk: n(c.blk), tpm: n(c.tpm), to: n(c.to),
        fgm: fg.made, fga: fg.att, ftm: ft.made, fta: ft.att,
      },
    }
  }
  return { lines, unmatched }
}
