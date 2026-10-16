// Runs inside the ESPN draft room page. ESPN pushes picks over a WebSocket to fantasydraft.espn.com
// ("SELECTED <teamId> <playerId> ..."), plus an INIT snapshot of the whole board on (re)join.
// Forward only those lines to draft-relay.js; nothing else is read, and nothing on the page is changed.
//
// Hook where the page reads a message (MessageEvent.data) rather than the WebSocket constructor:
// ESPN sometimes grabs the constructor before this script runs, but it always has to read each message.
;(() => {
  const KEEP = /^(INIT|SELECTED|SELECTING|CLOCK|STATE|PONG) /
  const DRAFT_SOCKET = /fantasydraft\.espn\.com\/.*league-(\d+)/
  const NativeWS = window.WebSocket
  const data = Object.getOwnPropertyDescriptor(MessageEvent.prototype, 'data')
  if (!data?.get) return
  const forwarded = new WeakSet()

  Object.defineProperty(MessageEvent.prototype, 'data', {
    ...data,
    get() {
      const value = data.get.call(this)
      try {
        if (!forwarded.has(this) && this.target instanceof NativeWS && typeof value === 'string' && KEEP.test(value)) {
          forwarded.add(this)
          const leagueId = this.target.url.match(DRAFT_SOCKET)?.[1]
          if (leagueId) window.postMessage({ __onTheClock: true, leagueId, line: value.trim() }, window.location.origin)
        }
      } catch {
        // Never let the helper break the draft room.
      }
      return value
    },
  })
})()
