type Candidate = { id: number; fit: number; p: number }

/** Expected best fit left at the next pick, players surviving independently; rows sorted best first. */
const expectedBest = (rows: Candidate[], skip?: number) => {
  let gone = 1
  let e = 0
  for (const r of rows) {
    if (r.id === skip) continue
    e += gone * r.p * Math.max(0, r.fit)
    gone *= 1 - r.p
  }
  return e
}

/** Fit gained over this pick and the next by taking him now: fit + best expected next without him − best expected anyway. */
export function nowScores(fit: Map<number, number>, survives: (id: number) => number | null) {
  const rows = [...fit]
    .map(([id, f]) => ({ id, fit: f, p: survives(id) ?? 0 }))
    .sort((a, b) => b.fit - a.fit)
  const base = expectedBest(rows)
  return new Map(rows.map((r) => [r.id, r.fit + expectedBest(rows, r.id) - base]))
}
