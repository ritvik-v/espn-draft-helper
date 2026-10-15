import { ordinal } from './format'
import { useDraft, useSession } from './store'

type Item = { label: string; ok: boolean; pending?: boolean; detail: string }

export function useSetupStatus(): Item[] {
  const { espn, teamCount, mySlot, hashtag, sections } = useDraft()
  const league = useSession((s) => s.league)
  const entries = sections.flatMap((x) => x.entries)
  const unmatched = entries.filter((e) => e.playerId === null).length
  const projected = hashtag ? Object.keys(hashtag.lines).length : 0
  const missed = hashtag?.unmatched ?? []
  const leagueOk = !espn.sync || league.ok
  return [
    {
      label: 'League',
      ok: leagueOk,
      pending: !leagueOk && !league.error && !!espn.leagueId,
      detail: !espn.sync
        ? `Manual, ${teamCount} teams`
        : leagueOk
          ? `${teamCount} teams, you pick ${ordinal(mySlot + 1)}`
          : (league.error ?? (espn.leagueId ? 'Loading…' : 'Set your league ID')),
    },
    {
      label: 'Projections',
      ok: projected > 0,
      detail: projected
        ? `Hashtag, ${projected} players${missed.length ? ` (unmatched: ${missed.join(', ')})` : ''}`
        : 'Import your Hashtag CSV. Until then values use ESPN projections',
    },
    {
      label: 'Rankings',
      ok: sections.length > 0,
      detail: sections.length
        ? `${sections.length} tiers, ${entries.length} players${unmatched ? `, ${unmatched} unmatched` : ''}`
        : 'Import your rankings CSV',
    },
  ]
}
