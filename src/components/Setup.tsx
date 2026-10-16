import { useState, type ReactNode } from 'react'
import { input, textBtn } from '../format'
import { parseHashtag } from '../lib/hashtag'
import { parseRankings } from '../lib/rankings'
import { nameMatcher } from '../lib/tiers'
import { useModel } from '../model'
import { useDraft } from '../store'
import { SetupChecklist } from './SetupChecklist'

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="flex min-h-6 items-center gap-3">
    <span className="w-24 shrink-0 text-zinc-400">{label}</span>
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

const message = (e: unknown) => (e instanceof Error ? e.message : String(e))

function CsvInput({ onFile, disabled, done }: { onFile: (file: File | undefined) => void; disabled: boolean; done: boolean }) {
  return (
    <span className={`relative ${disabled ? 'text-zinc-600' : 'text-amber-300 hover:text-amber-200'}`}>
      {done ? 'Replace CSV…' : 'Choose CSV…'}
      <input
        type="file"
        accept=".csv,text/csv"
        className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-default"
        disabled={disabled}
        onChange={(e) => {
          onFile(e.target.files?.[0])
          // Cleared so picking the same file again still re-imports it.
          e.target.value = ''
        }}
      />
    </span>
  )
}

export function Setup() {
  const s = useDraft()
  const { players } = useModel()
  const [rankingsStatus, setRankingsStatus] = useState('')
  const [hashtagStatus, setHashtagStatus] = useState('')
  const synced = s.espn.sync

  const importRankings = async (file: File | undefined) => {
    if (!file || !players.data) return
    if (s.sections.length && !confirm('Replace your tiers with these rankings?')) return
    try {
      const sections = parseRankings(await file.text(), nameMatcher(players.data))
      s.set({ sections })
      setRankingsStatus(`${sections.length} tiers`)
    } catch (e) {
      setRankingsStatus(message(e))
    }
  }

  const importHashtag = async (file: File | undefined) => {
    if (!file || !players.data) return
    try {
      const { lines, unmatched } = parseHashtag(await file.text(), players.data)
      s.set({ hashtag: { lines, importedAt: Date.now(), unmatched } })
      setHashtagStatus(`${Object.keys(lines).length} players${unmatched.length ? `, unmatched: ${unmatched.join(', ')}` : ''}`)
    } catch (e) {
      setHashtagStatus(message(e))
    }
  }

  return (
    <div className="max-w-xl space-y-5 p-3">
      <section className="space-y-1">
        <h2 className="font-semibold text-zinc-100">Ready to draft</h2>
        <SetupChecklist />
      </section>

      <section className="space-y-1">
        <h2 className="font-semibold text-zinc-100">Your data</h2>
        <Row label="Projections">
          <CsvInput onFile={importHashtag} disabled={!players.data} done={!!s.hashtag} />
        </Row>
        <Row label="">
          <span className="text-zinc-400">
            {hashtagStatus || (s.hashtag ? `Imported ${new Date(s.hashtag.importedAt).toLocaleString()}` : 'Hashtag Basketball CSV, exported with Z Score off')}
          </span>
        </Row>
        <Row label="Rankings">
          <CsvInput onFile={importRankings} disabled={!players.data} done={s.sections.length > 0} />
        </Row>
        <Row label="">
          <span className="text-zinc-400">
            {rankingsStatus || (s.sections.length ? `${s.sections.length} tiers loaded` : 'Rank, Player and Avg rank columns. Tiers split where Avg rank jumps.')}
          </span>
        </Row>
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
        <h2 className="font-semibold text-zinc-100">New draft</h2>
        <div className="flex items-baseline gap-3">
          <button
            className="shrink-0 text-rose-400 hover:text-rose-300 disabled:text-zinc-700"
            disabled={!s.punts.length && (synced || !s.picks.some((p) => !p.keeper))}
            onClick={() => confirm(synced ? 'Clear punts for a new draft?' : 'Clear punts and picks for a new draft?') && s.newDraft()}
          >
            Start new draft
          </button>
          <span className="text-zinc-400">{synced ? 'Clears punts.' : 'Clears punts and picks.'} Each league keeps its own punts, so a new league starts with none.</span>
        </div>
      </section>
    </div>
  )
}
