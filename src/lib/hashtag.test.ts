import { describe, expect, it } from 'vitest'
import { parseHashtag } from './hashtag'

const players = [{ id: 1, name: 'Nikola Jokić' }]

const HEADER = '"R#","PLAYER","ADP","POS","TEAM","GP","MPG","FG%","FT%","3PM","PTS","TREB","AST","STL","BLK","TO","TOTAL"'
const row = (rank: string, name: string, fg = '0.573\n(10.5/18.3)', ft = '0.816\n(5.6/6.8)') =>
  `"${rank}","${name}","1.4","C","DEN","72","35.1","${fg}","${ft}","1.8","28.4","12.7","10.4","1.6","0.7","3.5","15.87"`
const parse = (...rows: string[]) => parseHashtag([HEADER, ...rows].join('\n'), players)

describe('parseHashtag', () => {
  it('reads per-game lines, taking makes and attempts from the shooting cells', () => {
    expect(parse(row('1', 'Nikola Jokic')).lines[1]).toEqual({
      gp: 72,
      min: 35.1,
      stats: { pts: 28.4, reb: 12.7, ast: 10.4, stl: 1.6, blk: 0.7, tpm: 1.8, to: 3.5, fgm: 10.5, fga: 18.3, ftm: 5.6, fta: 6.8 },
    })
  })

  it('skips repeated headers, reads ranks with a change after them, and reports misses and duplicates', () => {
    const { lines, unmatched } = parse(row('1  3', 'Nikola Jokic'), HEADER, row('2', 'Nikola Jokić'), row('3', 'Nobody Here'))
    expect(Object.keys(lines)).toEqual(['1'])
    expect(unmatched).toEqual(['Nikola Jokić', 'Nobody Here'])
  })

  it('rejects a file it cannot read', () => {
    expect(() => parseHashtag('"PLAYER","GP"\n', players)).toThrow('R#')
    expect(() => parse(row('1', 'Nikola Jokic', '0.573', '0.816'))).toThrow('Z Score off')
  })
})
