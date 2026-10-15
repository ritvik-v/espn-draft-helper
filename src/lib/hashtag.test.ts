import { describe, expect, it } from 'vitest'
import { parseHashtag } from './hashtag'

const players = [
  { id: 1, name: 'Nikola Jokić' },
  { id: 2, name: 'Jaren Jackson Jr.' },
]

const HEADER = '"R#","PLAYER","ADP","POS","TEAM","GP","MPG","FG%","FT%","3PM","PTS","TREB","AST","STL","BLK","TO","TOTAL"'
const row = (rank: string, name: string) =>
  `"${rank}","${name}","1.4","C","DEN","72","35.1","0.573\n(10.5/18.3)","0.816\n(5.6/6.8)","1.8","28.4","12.7","10.4","1.6","0.7","3.5","15.87"`

describe('parseHashtag', () => {
  it('reads per-game lines with makes and attempts, matching names without accents or suffixes', () => {
    const { lines, unmatched } = parseHashtag([HEADER, row('1', 'Nikola Jokic'), row('2', 'Jaren Jackson')].join('\n'), players)
    expect(unmatched).toEqual([])
    expect(lines[1]).toEqual({
      gp: 72,
      min: 35.1,
      stats: { pts: 28.4, reb: 12.7, ast: 10.4, stl: 1.6, blk: 0.7, tpm: 1.8, to: 3.5, fgm: 10.5, fga: 18.3, ftm: 5.6, fta: 6.8 },
    })
    expect(lines[2]).toBeDefined()
  })

  it('skips repeated header rows and reports players it cannot match', () => {
    const { lines, unmatched } = parseHashtag([HEADER, row('1', 'Nikola Jokic'), HEADER, row('3  12', 'Nobody Here')].join('\n'), players)
    expect(Object.keys(lines)).toEqual(['1'])
    expect(unmatched).toEqual(['Nobody Here'])
  })

  it('names a missing column', () => {
    expect(() => parseHashtag('"PLAYER","GP"\n', players)).toThrow('R#')
  })
})

describe('parseHashtag guards', () => {
  it('keeps the first row when two names land on the same player', () => {
    const { lines, unmatched } = parseHashtag([HEADER, row('1', 'Nikola Jokic'), row('2', 'Nikola Jokić')].join('\n'), players)
    expect(Object.keys(lines)).toEqual(['1'])
    expect(unmatched).toEqual(['Nikola Jokić'])
  })

  it('rejects shooting cells without makes and attempts', () => {
    const bare = `"1","Nikola Jokic","1.4","C","DEN","72","35.1","0.573","0.816","1.8","28.4","12.7","10.4","1.6","0.7","3.5","15.87"`
    expect(() => parseHashtag([HEADER, bare].join('\n'), players)).toThrow('Z Score off')
  })
})
