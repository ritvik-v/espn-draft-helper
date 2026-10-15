<img src="public/icon.svg" width="64" height="64" alt="">

# Bucket List

Forked from [clayclark/BucketList](https://github.com/clayclark/BucketList) by Clay Clark, adapted to draft from imported Hashtag Basketball projections and consensus rankings.

A Chrome extension for ESPN 9-cat H2H fantasy basketball drafts (works in any Chromium browser: Chrome, Helium, Arc, Brave, Edge). It sits in the side panel next to ESPN's draft room, follows every pick as it happens, and answers the two questions that matter on the clock: **who fits my team**, and **who won't last until my next pick**.

| On the clock | Player detail | Team |
|---|---|---|
| <img src="docs/buckets.png" width="280" alt="Buckets tab at pick 6"> | <img src="docs/player.png" width="280" alt="Cade Cunningham expanded, showing how he moves each category rank"> | <img src="docs/team.png" width="280" alt="Team tab with category ranks and lineup slots"> |
| Bucket 5 won't last to #15, so it says take one now. | Drafting Cade moves you from 8th to 1st in assists. | Where you rank in each category, and which slots are open. |

## Install

```sh
pnpm install
pnpm build
```

1. Open `helium://extensions` (or `chrome://extensions`) and turn on **Developer mode**.
2. **Load unpacked** and pick the `dist` folder.
3. Log in to espn.com in the same browser, then click the toolbar icon to open the panel. `⤢` opens it in a full tab.

If the panel shows an **Allow** banner, the browser is withholding site access (Helium can do this). Allow it and reload the ESPN tab. After code changes, run `pnpm build` and hit reload on the extensions page.

## Use it for your league

Open Setup (`⚙`) and set three things:

- **League ID**: the `leagueId=` number in your ESPN league's URL. Your own team is found from your login.
- **Rankings CSV** or **Google Sheet**: your tiers. A rankings CSV (Rank, Player, Avg rank) is split into tiers wherever Avg rank jumps by 2 or more, 3 to 12 players each. A sheet must be shared as "anyone with the link can view"; then hit **Import sheet**.
- **Hashtag CSV**: your projections export from Hashtag Basketball, with Z Score off. Values switch to it on import.

The top of Setup shows whether all three are in, and Buckets shows a banner until they are.

The sheet is read as blocks: a header row of section names, then players listed down each column under them. A header cell starts with Bucket, Tier, Flier, Upside, Health or Spillage, and a sheet can have several header rows.

| Bucket 1 | Bucket 2 | Bucket 3 | Health Bucket |
|---|---|---|---|
| Nikola Jokic | Shai Gilgeous-Alexander | Cade Cunningham (TO) | Kawhi Leonard (30+) |
| Victor Wembanyama | Luka Doncic | Giannis Antetokounmpo (FT) | Anthony Davis (35+) |

Tags in parentheses are optional, and a cell can have several: `Trae Young (FG or TO) (34+)`. A pick range, `(40-55)` or `(30+)`, is where you think he's worth taking; a range in a header, `Upside Fliers (~100+)`, covers everyone under it without their own. Anything else, like `(TO)`, is shown as a note. Number-only cells and ALL-CAPS notes are skipped. No sheet? Build your buckets in the panel with **Edit**.

## Draft night

1. Open the panel. It reads your league with your ESPN login and finds your team on its own.
2. Set any punts in **Team** (or let the punt advisor suggest one once you have a few picks).
3. **Join ESPN's draft room and keep it open.** Picks come from the room's live feed, because ESPN's league API doesn't update during a draft. Joining late or reloading is fine: the room sends a full board on join and the panel catches up. The extension only listens to the room. It never changes ESPN's page, and only runs on ESPN fantasy basketball pages.
4. On the clock, read the **Take** line under the clock: the best two players by Now. Click one to see him in Players. Buckets shows the same call by tier: take from the highest bucket marked "take one now", and skip players marked "can wait".

Each league keeps its own punts, so a mock draft's punts don't follow you into your real one, and returning to a league brings its punts back. Setup → **Start new draft** clears them by hand.

ESPN's practice drafts work the same way, so a mock is a full rehearsal.

## Reading a player row

| | What it means |
|---|---|
| **Heat strip** | 9 cells, one per category. Green helps, red hurts, brighter is stronger. |
| **Val** | How good he is in a vacuum: a z-score total across the 9 categories (minus any you punt), against the top `teams × roster` players. |
| **Now** | What taking him adds over this pick and your next: his Fit (how many more categories per week he's expected to win *you*, shown in his details), less what you would likely get from him (or someone as good) at your next pick anyway. A great player who will be back scores low. The green bar behind it compares him to the best Now on the board, and amber marks your top 3. From your third pick, Buckets and Players sort by it. |
| **%** | The chance he's still there at your next pick. In Buckets, its header sorts each bucket by ADP, earliest first. |

Bucket headers show how many are left, the ADP range of who's left, and how many should still be there at your next pick. Near your pick, the highest bucket that won't last says **take one now**, players likely to come back say **can wait**, and a line lists who's likely still there next time.

## Tabs

- **Category strip**: your rank in each category, always visible under the clock. Hover or select a player to preview how he moves each rank.
- **Buckets**: your tier sheet, with taken players dropping out. A pick range tag is grey before your pick reaches it, green in it, and amber once he's slid past it. Until his range starts, a player stays listed but doesn't count toward "left" or "take one now". The grey number after it is his ADP. **Edit** re-tiers by drag and drop; Setup → **Copy as sheet** copies your buckets back in the sheet's layout.
- **Players**: everyone, sortable by value, Now, fit, ADP or availability. Click a row (or use the arrow keys) for details, including exactly which of your ranks he changes.
- **Team**: the punt advisor, category ranks with punt toggles, and your roster placed into your league's lineup slots.
- **League**: category standings with your expected record against each team, the draft board, and rosters.

## Where the numbers come from

- **Projections**: a Hashtag Basketball projections CSV imported in Setup, exported with Z Score off. ESPN projections and last season stay selectable under Stats; players missing from the CSV use ESPN projections.
- **ADP**: ESPN and Fantrax, with ESPN counting double because your league drafts from its board. Only sources that draft the player count. ESPN parks undrafted players near pick 140, so those values are ignored. ESPN alone if Fantrax fails to load.
- **Category swings**: Josh Lloyd's [2025-26 consistency study](https://joshlloydfantasy.com/research/fantasy-basketball-consistency-study/). Fit counts a lead in a steady category (rebounds, points) as more likely to win the week than the same lead in a streaky one (steals, blocks).
- **Picks**: the draft room's live feed, placed on ESPN's real pick order (traded picks, third-round reversal) with keepers at their reserved picks. Turn sync off in Setup to enter picks by hand (search + Enter, Cmd+Z to undo).
- **Buckets**: your rankings CSV or Google Sheet, set in Setup.

## Dev

`pnpm dev` runs the same UI at http://localhost:5173. To reach a private league there, put `ESPN_S2` and `ESPN_SWID` (your espn.com cookies) in `.env.local`; the dev server proxies them. They never reach the built extension.

`pnpm test`, `pnpm lint` and `pnpm build` should all pass before a merge.

## License

MIT. Not affiliated with or endorsed by ESPN, Fantrax or Hashtag Basketball.
