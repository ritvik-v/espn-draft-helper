import { useEffect, useState } from 'react'

const DRAFT_ROOM = 'https://fantasy.espn.com/basketball/draft*'

export type DraftRoom = { tabId: number; leagueId: string }

/** The open ESPN draft room tab and its league, checked every few seconds. */
export function useDraftRoom(): DraftRoom | null {
  const [room, setRoom] = useState<DraftRoom | null>(null)
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.tabs) return
    const check = async () => {
      const [tab] = await chrome.tabs.query({ url: DRAFT_ROOM })
      const leagueId = tab?.url ? new URL(tab.url).searchParams.get('leagueId') : null
      setRoom((prev) => {
        if (!tab?.id || !leagueId) return null
        return prev?.tabId === tab.id && prev.leagueId === leagueId ? prev : { tabId: tab.id, leagueId }
      })
    }
    check()
    const timer = setInterval(check, 5000)
    return () => clearInterval(timer)
  }, [])
  return room
}
