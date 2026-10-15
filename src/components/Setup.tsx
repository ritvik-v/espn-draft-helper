import { useState, type ReactNode } from 'react'
import { input, textBtn } from '../format'
import { parseHashtag } from '../lib/hashtag'
import { importSheet } from '../lib/importSheet'
import { parseRankings } from '../lib/rankings'
import { nameMatcher, sectionsToRows } from '../lib/tiers'
import { useModel } from '../model'
import { useDraft } from '../store'
import { SetupChecklist } from './SetupChecklist'

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="flex min-h-6 items-center gap-3">
    <span className="w-24 shrink-0 text-zinc-500">{label}</span>
    {children}
  </label>
)

const Toggle = ({ on, onClick, labels }: { on: boolean; onClick: (v: boolean) => void; labels: [string, string] }) => (
  <span className="flex gap-3">
    <button className={on ? 'text-zinc-100' : textBtn} onClick={() => onClick(true)}>
      {labels[0]}
    </button>
    <button className={!on ? 'text-zinc-100' : textBtn} onClick={() => onClick(false)}>
      {labels[1]}
    </button>
  </span>
)

export function Setup() {
  const s = useDraft()
  const { players } = useModel()
  const [sheetStatus, setSheetStatus] = useState('')
  const [hashtagStatus, setHashtagStatus] = useState('')
  const unmatched = s.sections.flatMap((x) => x.entries).filter((e) => e.playerId === null).length
  const synced = s.espn.sync

  const reimport = async () => {
    if (!players.data) return
    if (s.sections.length && !confirm('Replace your tiers (and any edits) with the sheet?')) return
    setSheetStatus('Importing…')
    try {
      s.setSections(await importSheet(s.sheetUrl, players.data))
      setSheetStatus('Imported')
    } catch (e) {
      setSheetStatus(e instanceof Error ? e.message : String(e))
    }
  }

  const importRankings = async (file: File | undefined) => {
    if (!file || !players.data) return
    if (s.sections.length && !confirm('Replace your tiers (and any edits) with the rankings?')) return
    try {
      const sections = parseRankings(await file.text(), nameMatcher(players.data))
      s.setSections(sections)
      setSheetStatus(`${sections.length} tiers`)
    } catch (e) {
      setSheetStatus(e instanceof Error ? e.message : String(e))
    }
  }

  const importHashtag = async (file: File | undefined) => {
    if (!file || !players.data) return
    try {
      const { lines, unmatched } = parseHashtag(await file.text(), players.data)
      s.set({ hashtag: { lines, importedAt: Date.now(), unmatched }, basis: 'hashtag' })
      const count = Object.keys(lines).length
      setHashtagStatus(`${count} players${unmatched.length ? `, unmatched: ${unmatched.join(', ')}` : ''}`)
    } catch (e) {
      setHashtagStatus(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="max-w-xl space-y-5 p-3">
      <section className="space-y-1">
        <h2 className="font-semibold text-zinc-100">Ready to draft</h2>
        <SetupChecklist />
      </section>

      <section className="space-y-1">
        <h2 className="font-semibold text-zinc-100">ESPN</h2>
        <Row label="League ID">
          <input
            key={s.espn.leagueId}
            defaultValue={s.espn.leagueId}
            className={`${input} w-28`}
            // Applied on Enter or blur, so a half-typed ID never loads someone else's league.
            onBlur={(e) => s.set({ espn: { ...s.espn, leagueId: e.target.value.trim() } })}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
        </Row>
        <Row label="Picks">
          <Toggle on={synced} onClick={(sync) => s.set({ espn: { ...s.espn, sync } })} labels={['Sync from ESPN', 'Enter manually']} />
        </Row>
        <Row label="My team">
          <select value={s.mySlot} className={input} onChange={(e) => s.set({ mySlot: Number(e.target.value) })}>
            {s.teamNames.map((name, i) => (
              <option key={i} value={i}>
                {i + 1}. {name}
              </option>
            ))}
          </select>
        </Row>
        {!synced && (
          <>
            <Row label="Teams">
              <input type="number" min={2} max={20} value={s.teamCount} className={`${input} w-16`}
                onChange={(e) => s.setTeamCount(Math.max(2, Number(e.target.value)))} />
            </Row>
            <Row label="Roster size">
              <input type="number" min={1} max={20} value={s.rosterSize} className={`${input} w-16`}
                onChange={(e) => s.set({ rosterSize: Math.max(1, Number(e.target.value)) })} />
            </Row>
          </>
        )}
      </section>

      <section className="space-y-1">
        <h2 className="font-semibold text-zinc-100">Values</h2>
        <Row label="Stats">
          <span className="flex gap-3">
            {([['hashtag', 'Hashtag'], ['proj', 'ESPN projections'], ['last', 'Last season']] as const).map(([key, label]) => (
              <button key={key} className={s.basis === key ? 'text-zinc-100' : textBtn} disabled={key === 'hashtag' && !s.hashtag}
                onClick={() => s.set({ basis: key })}>
                {label}
              </button>
            ))}
          </span>
        </Row>
        <Row label="Hashtag CSV">
          <input type="file" accept=".csv,text/csv" className="min-w-0 flex-1 text-zinc-400" disabled={!players.data} onChange={(e) => {
            importHashtag(e.target.files?.[0])
            e.target.value = ''
          }} />
        </Row>
        <Row label="">
          <span className="text-zinc-500">
            {hashtagStatus || (s.hashtag ? `Imported ${new Date(s.hashtag.importedAt).toLocaleString()}` : 'Export with Z Score off')}
          </span>
        </Row>
        <Row label="Scale">
          <Toggle on={!s.totals} onClick={(perGame) => s.set({ totals: !perGame })} labels={['Per game', 'Season totals']} />
        </Row>
      </section>

      <section className="space-y-1">
        <h2 className="font-semibold text-zinc-100">Tier sheet</h2>
        <Row label="Rankings CSV">
          <input type="file" accept=".csv,text/csv" className="min-w-0 flex-1 text-zinc-400" disabled={!players.data} onChange={(e) => {
            importRankings(e.target.files?.[0])
            e.target.value = ''
          }} />
        </Row>
        <Row label="Google Sheet">
          <input value={s.sheetUrl} className={`${input} min-w-0 flex-1`} onChange={(e) => s.set({ sheetUrl: e.target.value })} />
        </Row>
        <Row label="">
          <button className="text-amber-300 hover:text-amber-200" onClick={reimport}>
            Import sheet
          </button>
          <span className="text-zinc-500">{sheetStatus}</span>
          {unmatched > 0 && <span className="text-rose-400">{unmatched} unmatched</span>}
        </Row>
        <Row label="Backup">
          <button
            className="text-amber-300 hover:text-amber-200"
            onClick={async () => {
              // Tab-separated, so pasting into the sheet fills cells in the same layout it was imported from.
              await navigator.clipboard.writeText(sectionsToRows(s.sections).map((r) => r.join('\t')).join('\n'))
              setSheetStatus('Copied. Paste into a blank tab of your Google Sheet.')
            }}
          >
            Copy as sheet
          </button>
          <span className="text-zinc-500">Your buckets with edits, in the sheet's layout</span>
        </Row>
      </section>

      <section className="space-y-1">
        <h2 className="font-semibold text-zinc-100">New draft</h2>
        <div className="flex items-baseline gap-3">
          <button
            className="shrink-0 text-rose-400 hover:text-rose-300 disabled:text-zinc-700"
            disabled={!s.punts.length && (synced || !s.picks.some((p) => !p.keeper))}
            onClick={() => confirm(synced ? 'Clear punts for a new draft?' : 'Clear punts and picks for a new draft?') && s.newDraft()}
          >
            Start new draft
          </button>
          <span className="text-zinc-500">{synced ? 'Clears punts.' : 'Clears punts and picks.'} Each league keeps its own punts, so a new league starts with none.</span>
        </div>
      </section>
    </div>
  )
}
