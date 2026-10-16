import { nameMatcher } from './tiers'

/** Fantrax ADP keyed by ESPN player id. Fantrax writes names as "Last, First". */
export async function fetchFantraxAdp(players: { id: number; name: string }[]) {
  const res = await fetch('https://www.fantrax.com/fxea/general/getAdp?sport=NBA&start=1&limit=1000&order=ADP')
  if (!res.ok) throw new Error(`Fantrax ADP ${res.status}`)
  const rows: { name: string; ADP: number }[] = await res.json()
  const match = nameMatcher(players)
  const adp = new Map<number, number>()
  for (const r of rows) {
    const id = match(r.name.split(', ').reverse().join(' '))
    if (id !== null && !adp.has(id)) adp.set(id, r.ADP)
  }
  return adp
}

// ESPN parks players nobody drafts at an ADP of about 140, so anything this late isn't a real pick.
const ESPN_UNDRAFTED = 139
// Off ESPN's board means an ESPN room mostly won't take him before here.
const ESPN_LATE = 150
// ESPN leagues draft from ESPN's board, so its ADP predicts them better than Fantrax's.
const ESPN_WEIGHT = 2

/** Weighted blend, ESPN counting double; null if neither source drafts him. */
export function blendAdp(espn: number | null, fantrax: number | undefined) {
  if (espn === null) return fantrax ?? null
  const onBoard = espn < ESPN_UNDRAFTED ? espn : null
  if (fantrax === undefined) return onBoard
  const espnSide = onBoard ?? Math.max(ESPN_LATE, fantrax)
  return (espnSide * ESPN_WEIGHT + fantrax) / (ESPN_WEIGHT + 1)
}
