import { rankStyle } from '../format'
import { CAT_LABEL, CATS, type Cat } from '../lib/cats'
import { expectedWins } from '../lib/value'
import { useModel } from '../model'
import { useDraft } from '../store'

/** Every team's rank in each category, with your expected record against each. */
export function Standings() {
  const { teams, draft, cats } = useModel()
  const { teamAbbrevs, teamNames, mySlot } = useDraft()
  const { strengths } = teams
  const n = strengths.length
  const mine = strengths[mySlot]
  const rank = (i: number, c: Cat) => 1 + strengths.filter((s) => s[c] > strengths[i][c]).length
  const vsField = (i: number) =>
    strengths.reduce((sum, o, j) => (j === i ? sum : sum + expectedWins(strengths[i], o, CATS, teams.winScale)), 0) / (n - 1 || 1)

  return (
    <div>
      <table className="w-full table-fixed text-center">
        <thead className="text-[11px] text-zinc-500">
          <tr>
            <th className="w-14 text-left font-normal">Team</th>
            {CATS.map((c) => (
              <th key={c} className={`font-normal ${cats.includes(c) ? '' : 'line-through'}`}>
                {CAT_LABEL[c]}
              </th>
            ))}
            <th className="w-10 font-normal" title="Expected category wins vs an average opponent">
              Avg
            </th>
            <th className="w-14 font-normal" title="Your expected category record against this team">
              You
            </th>
          </tr>
        </thead>
        <tbody>
          {strengths.map((s, i) => {
            const me = i === mySlot
            const h2h = mine && !me ? expectedWins(mine, s, CATS, teams.winScale) : null
            return (
              <tr key={i}>
                <td className={`truncate text-left ${me ? 'text-emerald-400' : 'text-zinc-300'}`} title={teamNames[i]}>
                  {draft.onClock === i ? <span className="text-amber-300">▸</span> : null}
                  {teamAbbrevs[i]}
                </td>
                {CATS.map((c) => {
                  const r = rank(i, c)
                  return (
                    <td key={c} className="py-0.5" style={rankStyle(r, n)}>
                      {r}
                    </td>
                  )
                })}
                <td className="text-zinc-400">{vsField(i).toFixed(1)}</td>
                <td className={h2h === null ? '' : h2h > 4.5 ? 'text-emerald-400' : 'text-rose-400'}>
                  {h2h === null ? '' : `${h2h.toFixed(1)}-${(9 - h2h).toFixed(1)}`}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
