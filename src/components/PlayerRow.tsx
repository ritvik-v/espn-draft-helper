import { useEffect, useRef, type ReactNode } from 'react'
import { signed } from '../format'
import { useModel } from '../model'
import { useDraft, useSession } from '../store'
import { Avail, Fingerprint, Injury } from '../ui'
import { PlayerDetail } from './PlayerDetail'

/**
 * One player, the same everywhere: name and tags, the 9-category heat strip, value, Now and the chance he's
 * back at your next pick. Hover previews him in the category strip; click expands details in place.
 */
export function PlayerRow({
  id,
  tag,
  detailed = false,
}: {
  id: number
  tag?: ReactNode
  detailed?: boolean
}) {
  const { byId, allPlayers, draft, availAtTarget, now, nowMax, slots, topNow } = useModel()
  const { mySlot, teamAbbrevs, selectedId, punts, espn, set, draft: draftPlayer } = useDraft()
  const ref = useRef<HTMLDivElement>(null)
  const selected = selectedId === id
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: 'nearest' })
  }, [selected])
  // A row can disappear under the cursor (tab switch, player drafted) without a mouseleave.
  useEffect(
    () => () => {
      if (useSession.getState().previewId === id) useSession.setState({ previewId: null })
    },
    [id],
  )

  const player = allPlayers.get(id)
  if (!player) return null
  const v = byId.get(id)
  const taken = draft.drafted.get(id)
  const mine = taken?.slot === mySlot
  const gain = now.get(id)
  const noSlot = !taken && slots.tight && !slots.fills(player.pos)

  return (
    <div
      ref={ref}
      data-player-row={id}
      className={`-mx-1 px-1 ${selected ? 'bg-zinc-900' : ''}`}
    >
      <div
        className={`flex h-7 cursor-default items-center gap-1.5 ${selected ? '' : 'hover:bg-zinc-950'}`}
        onClick={() => set({ selectedId: selected ? null : id })}
        onDoubleClick={() => !espn.sync && !taken && draftPlayer(id)}
        onMouseEnter={() => useSession.setState({ previewId: id })}
        onMouseLeave={() => useSession.setState({ previewId: null })}
      >
        <span className={`truncate ${mine ? 'text-emerald-400' : taken ? 'text-zinc-600 line-through' : 'text-zinc-100'}`}>{player.name}</span>
        {tag}
        {!taken && <Injury status={player.injury} />}
        {noSlot && (
          <span className="shrink-0 text-[11px] text-rose-400" title={`You still need ${slots.open.join(', ')} and are running out of picks`}>
            no slot
          </span>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-2 text-right">
          {taken ? (
            <span className={mine ? 'text-emerald-400' : 'text-zinc-600'}>
              {mine ? 'Mine' : teamAbbrevs[taken.slot]} {taken.keeper ? 'K' : `#${taken.pick}`}
            </span>
          ) : (
            <>
              {v && <Fingerprint z={v.z} punts={punts} detailed={detailed} />}
              <span className="w-8 text-zinc-300">{v ? v.value.toFixed(1) : '-'}</span>
              <span
                className={`relative w-10 ${topNow.has(id) ? 'font-semibold text-amber-300' : gain !== undefined && gain > 0.05 ? 'text-zinc-200' : 'text-zinc-600'}`}
                title={topNow.has(id) ? 'One of your 3 best picks now' : 'Now: what taking him adds over this pick and your next'}
              >
                {gain !== undefined && gain > 0 && nowMax > 0 && (
                  <span className="absolute inset-y-0 right-0 rounded-sm bg-emerald-400/20" style={{ width: `${(gain / nowMax) * 100}%` }} />
                )}
                <span className="relative">{gain === undefined ? '' : signed(gain, 2)}</span>
              </span>
              <span className="w-9">
                <Avail p={availAtTarget(id)} />
              </span>
            </>
          )}
        </span>
      </div>
      {/* Narrow panel: details open in place. Wide layout shows them in the side column instead. */}
      {selected && (
        <div className="pb-2 lg:hidden">
          <PlayerDetail variant="inline" />
        </div>
      )}
    </div>
  )
}
