export type TierEntry = { id: string; playerId: number | null; name: string; tag: string | null }
export type Section = { id: string; name: string; note: string | null; entries: TierEntry[] }

export const parseCsv = (text: string) => {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell || row.length) rows.push([...row, cell])
  return rows
}

const SUFFIX = /\b(jr|sr|ii|iii|iv)\b/g
const normalize = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[.'’]/g, '')
    .replace(SUFFIX, '')
    .replace(/[^a-z ]/g, ' ')
    .trim()
    .split(/\s+/)

/** Matches CSV names to ESPN players: exact first, then same last name with a nickname-style first name (Steph/Stephen). */
export const nameMatcher = (players: { id: number; name: string }[]) => {
  const exact = new Map<string, number>()
  const byLast = new Map<string, { first: string; id: number }[]>()
  for (const p of players) {
    const parts = normalize(p.name)
    exact.set(parts.join(''), p.id)
    const last = parts.slice(1).join('')
    byLast.set(last, [...(byLast.get(last) ?? []), { first: parts[0], id: p.id }])
  }
  return (name: string): number | null => {
    const parts = normalize(name)
    const hit = exact.get(parts.join(''))
    if (hit !== undefined) return hit
    const first = parts[0]
    const candidates = (byLast.get(parts.slice(1).join('')) ?? []).filter(
      (c) => c.first.startsWith(first) || first.startsWith(c.first),
    )
    return candidates.length === 1 ? candidates[0].id : null
  }
}
