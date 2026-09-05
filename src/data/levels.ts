import type { Level, Clue, RegionDef } from "../core/types"

function makeLcg(seed: number) {
  let s = seed >>> 0
  return (): number => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function partition(
  rows: number,
  cols: number,
  maxArea: number,
  stopProb: number,
  rng: () => number,
): RegionDef[] {
  const minArea = 2

  function split(r0: number, c0: number, r1: number, c1: number): RegionDef[] {
    const h = r1 - r0 + 1
    const w = c1 - c0 + 1
    const area = h * w
    const rect: RegionDef = { row: r0, col: c0, height: h, width: w }

    if (area <= minArea) return [rect]
    if (area <= maxArea && rng() < stopProb) return [rect]

    for (const horiz of shuffle([true, false], rng)) {
      if (horiz && h >= 2) {
        const minH = Math.ceil(minArea / w)
        if (2 * minH > h) continue
        const lo = minH
        const hi = h - minH
        const sp = lo + Math.floor(rng() * (hi - lo + 1))
        return [
          ...split(r0, c0, r0 + sp - 1, c1),
          ...split(r0 + sp, c0, r1, c1),
        ]
      }
      if (!horiz && w >= 2) {
        const minW = Math.ceil(minArea / h)
        if (2 * minW > w) continue
        const lo = minW
        const hi = w - minW
        const sp = lo + Math.floor(rng() * (hi - lo + 1))
        return [
          ...split(r0, c0, r1, c0 + sp - 1),
          ...split(r0, c0 + sp, r1, c1),
        ]
      }
    }

    return [rect]
  }

  return split(0, 0, rows - 1, cols - 1)
}

function placeClues(solution: RegionDef[], rng: () => number): Clue[] {
  return solution.map((rect) => ({
    row: rect.row + Math.floor(rng() * rect.height),
    col: rect.col + Math.floor(rng() * rect.width),
    value: rect.height * rect.width,
  }))
}

function specFor(i: number) {
  if (i < 10) return { rows: 5, cols: 5, maxArea: 6, stopProb: 0.55 }
  if (i < 20) return { rows: 5, cols: 6, maxArea: 7, stopProb: 0.5 }
  if (i < 30) return { rows: 6, cols: 6, maxArea: 8, stopProb: 0.47 }
  if (i < 40) return { rows: 6, cols: 7, maxArea: 9, stopProb: 0.44 }
  if (i < 50) return { rows: 7, cols: 7, maxArea: 9, stopProb: 0.41 }
  if (i < 60) return { rows: 7, cols: 8, maxArea: 10, stopProb: 0.38 }
  if (i < 70) return { rows: 8, cols: 8, maxArea: 12, stopProb: 0.36 }
  if (i < 80) return { rows: 8, cols: 9, maxArea: 12, stopProb: 0.33 }
  if (i < 90) return { rows: 9, cols: 9, maxArea: 14, stopProb: 0.31 }
  return { rows: 9, cols: 10, maxArea: 15, stopProb: 0.29 }
}

// Precomputed seeds that yield exactly one valid solution.
const UNIQUE_SEEDS = [
  3735928559, 2095397032, 473954248, 3166567503, 1468769747, 4123205516,
  2520851475, 899408691, 3496578231, 1856046704, 272781406, 2869950946,
  1229419419, 3883855188, 2243323661, 621880877, 3257227903, 1616696376,
  14342335, 2649689361, 990069091, 3663593603, 2042150819, 363441806,
  3017877575, 1377346048, 4050870560, 2391250290, 884339964, 3481509504,
  1802800491, 181357707, 3007592163, 1157084463, 3830608975, 2151899962,
  511368435, 3165804204, 1525272677, 4217885932, 2539176919, 917734135,
  3553081161, 1969815863, 310195593, 3060075077, 1324099835, 3940358118,
  2318915334, 754738779, 3313730833, 1730465535, 147200237, 2706192291,
  1103838250, 3796451505, 2079565006, 439033479, 3074380505, 1510203950,
  4126462233, 2447753220, 940842894, 3518923691, 1897480907, 218771894,
  2930473892, 1461741052, 3868023162, 2208402892, 606048851, 3260484620,
  1715396808, 55776538, 2595679849, 993325808, 3609584091, 2179028737,
  366698523, 2982956806, 1418780251, 217289813, 2394507007, 773064223,
  3599298679, 1806057208, 127348195, 2896316422, 1542116040, 4024753122,
  2116979193, 743690068, 3169060921, 1528529394, 4221142649, 2618788608,
  863724623, 3613604107, 1934895094, 275274824,
]

function makeLevel(id: number): Level {
  const i = id - 1
  const { rows, cols, maxArea, stopProb } = specFor(i)
  const seed = UNIQUE_SEEDS[i]
  const rng = makeLcg(seed)
  const solution = partition(rows, cols, maxArea, stopProb, rng)
  const clues = placeClues(solution, rng)
  return { id, rows, cols, clues, solution }
}

export const LEVELS: Level[] = Array.from({ length: 100 }, (_, i) =>
  makeLevel(i + 1),
)
