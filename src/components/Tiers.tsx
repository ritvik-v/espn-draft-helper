import { useState } from 'react'
import { textBtn } from '../format'
import { CAT_LABEL } from '../lib/cats'
import type { Section, TierEntry } from '../lib/tiers'
import { useModel } from '../model'
import { useDraft } from '../store'
import { Banner } from '../ui'
import { useSetupStatus } from '../useSetupStatus'
import { PlayerRow } from './PlayerRow'

type Order = 'rank' | 'value' | 'now' | 'avail'

export function Tiers() {
  const { sections, showTaken, set, togglePunt } = useDraft()
  const { draft, players, nowFirst, puntTips } = useModel()
  const tip = puntTips[0]
  const missing = useSetupStatus().filter((i) => !i.ok && !i.pending)
  const [chosen, setOrder] = useState<Order | null>(null)
  const order = chosen ?? (nowFirst ? 'now' : 'rank')

  const left = (e: TierEntry) => e.playerId !== null && !draft.drafted.has(e.playerId)
  const shownSections = showTaken ? sections : sections.filter((s) => s.entries.some(left))
  const current = sections.find((s) => s.entries.some(left))?.id

  // Clicking the active column goes back to your rankings order.
  const col = (o: Order, label: string, className: string, title: string) => (
    <button
      className={`${className} text-right ${order === o ? 'text-zinc-100' : 'hover:text-zinc-200'}`}
      title={title}
      onClick={() => setOrder(order === o ? 'rank' : o)}
    >
      {label}
      {order === o && '▾'}
    </button>
  )

  if (!sections.length) {
    return (
      <div className="p-3 text-zinc-400">
        {players.isPending ? (
          'Loading players…'
        ) : (
          <>
            No tiers yet.{' '}
            <button className="text-amber-300 hover:text-amber-200" onClick={() => set({ tab: 'Setup' })}>
              Import your rankings CSV in Setup
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div>
      {missing.length > 0 && (
        <Banner action="Setup" onAction={() => set({ tab: 'Setup' })}>
          Not set up: {missing.map((i) => i.label).join(', ')}
        </Banner>
      )}
      {tip && (
        <div className="flex items-baseline gap-3 border-b border-zinc-900 px-3 py-1.5 text-zinc-300">
          <span>
            Punt <span className="font-semibold text-amber-300">{CAT_LABEL[tip.cat]}</span>? You win it {Math.round(tip.winRate * 100)}% of weeks.
          </span>
          <button className="ml-auto shrink-0 font-semibold text-amber-300 hover:text-amber-200" onClick={() => togglePunt(tip.cat)}>
            Punt {CAT_LABEL[tip.cat]}
          </button>
        </div>
      )}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-zinc-900 bg-black px-3 py-1 text-[11px] text-zinc-400">
        <button className={showTaken ? 'text-zinc-200' : textBtn} onClick={() => set({ showTaken: !showTaken })}>
          {showTaken ? 'Hide taken' : 'Show taken'}
        </button>
        <span className="ml-auto flex gap-2">
          {col('value', 'Val', 'w-8', 'Value from your projections, across your non-punted categories')}
          {col('now', 'Now', 'w-10', 'What taking him adds over this pick and your next. Pick the highest.')}
          {col('avail', draft.target ? `#${draft.target}` : 'Left', 'w-9', "Chance he's still there at this pick if you pass on him")}
        </span>
      </div>
      <div className="grid items-start gap-x-6 px-3 lg:grid-cols-[repeat(auto-fill,minmax(380px,1fr))]">
        {shownSections.map((s) => (
          <Tier key={s.id} section={s} current={s.id === current} order={order} isLeft={left} />
        ))}
      </div>
    </div>
  )
}

function Tier({ section, current, order, isLeft }: { section: Section; current: boolean; order: Order; isLeft: (e: TierEntry) => boolean }) {
  const { showTaken } = useDraft()
  const { byId, now, availAtTarget } = useModel()
  // Unmatched names stay listed so you can fix them, but never count as left.
  const visible = showTaken ? section.entries : section.entries.filter((e) => e.playerId === null || isLeft(e))
  const score = (e: TierEntry) => {
    if (e.playerId === null || !isLeft(e)) return -Infinity
    if (order === 'value') return byId.get(e.playerId)?.value ?? -99
    if (order === 'now') return now.get(e.playerId) ?? -99
    return -(availAtTarget(e.playerId) ?? 2)
  }
  const shown = order === 'rank' ? visible : [...visible].sort((a, b) => score(b) - score(a))
  const left = section.entries.filter(isLeft).length

  return (
    <section className="pb-3 pt-2">
      <header className="flex items-baseline gap-2 border-b border-zinc-800 pb-0.5">
        <span className={`font-semibold ${current ? 'text-amber-300' : left ? 'text-zinc-100' : 'text-zinc-500'}`}>{section.name}</span>
        <span className="text-zinc-400">{left} left</span>
      </header>
      {shown.map((entry) =>
        entry.playerId === null ? (
          <Unmatched key={entry.id} entry={entry} />
        ) : (
          <PlayerRow key={entry.id} id={entry.playerId} />
        ),
      )}
    </section>
  )
}

function Unmatched({ entry }: { entry: TierEntry }) {
  const { players } = useModel()
  const updateEntry = useDraft((s) => s.updateEntry)
  const listId = `players-${entry.id}`
  return (
    <div className="flex h-7 items-center gap-1.5" title="No ESPN match. Pick the right player.">
      <span className="text-rose-400">?</span>
      <input
        list={listId}
        defaultValue={entry.name}
        className="min-w-0 flex-1 bg-transparent text-rose-300 outline-none"
        onChange={(e) => {
          const hit = players.data?.find((p) => p.name === e.target.value)
          if (hit) updateEntry(entry.id, { playerId: hit.id, name: hit.name })
        }}
      />
      <datalist id={listId}>
        {players.data?.map((p) => <option key={p.id} value={p.name} />)}
      </datalist>
    </div>
  )
}
