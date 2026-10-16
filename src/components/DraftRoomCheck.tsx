import { useState } from 'react'
import { Banner } from '../ui'
import type { DraftRoom } from '../useDraftRoom'
import { useNow } from '../useNow'

/**
 * Safety net: a draft room tab is open but its picks aren't reaching us (the room loaded before the
 * extension could listen). One reload fixes it, so offer that instead of silently showing stale picks.
 * `feedLeague` is the league the feed last heard from, finished drafts included, so a room left open
 * after its draft ends doesn't trigger this.
 */
export function DraftRoomCheck({ feedLeague, room }: { feedLeague: string | null; room: DraftRoom | null }) {
  const disconnected = !!room && feedLeague !== room.leagueId
  const now = useNow(5000)
  const [since, setSince] = useState<number | null>(disconnected ? now : null)
  const [wasDisconnected, setWasDisconnected] = useState(disconnected)
  if (disconnected !== wasDisconnected) {
    setWasDisconnected(disconnected)
    setSince(disconnected ? now : null)
  }

  // Wait a few seconds so a room that's still loading doesn't flash the warning.
  if (!room || !disconnected || since === null || now - since < 10_000) return null
  return (
    <Banner action="Reload draft room" onAction={() => chrome.tabs.reload(room.tabId)}>
      Draft room isn't sending picks yet.
    </Banner>
  )
}
