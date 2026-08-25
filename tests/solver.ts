import { LEVELS } from "../src/game/data/levels"

function solve(level: any): number {
  const { rows, cols, clues } = level
  const board = Array.from({ length: rows }, () => new Array(cols).fill(-1))
  let solutionsFound = 0

  function backtrack(clueIdx: number) {
    if (solutionsFound >= 2) return

    if (clueIdx === clues.length) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (board[r][c] === -1) return
        }
      }
      solutionsFound++
      return
    }

    const clue = clues[clueIdx]
    for (let h = 1; h <= clue.value; h++) {
      if (clue.value % h !== 0) continue
      const w = clue.value / h

      for (let r0 = Math.max(0, clue.row - h + 1); r0 <= clue.row && r0 + h - 1 < rows; r0++) {
        for (let c0 = Math.max(0, clue.col - w + 1); c0 <= clue.col && c0 + w - 1 < cols; c0++) {
          let canPlace = true
          for (let r = r0; r < r0 + h; r++) {
            for (let c = c0; c < c0 + w; c++) {
              if (board[r][c] !== -1) {
                canPlace = false
                break
              }
            }
            if (!canPlace) break
          }

          if (canPlace) {
            for (let r = r0; r < r0 + h; r++) {
              for (let c = c0; c < c0 + w; c++) {
                board[r][c] = clueIdx
              }
            }

            backtrack(clueIdx + 1)

            for (let r = r0; r < r0 + h; r++) {
              for (let c = c0; c < c0 + w; c++) {
                board[r][c] = -1
              }
            }
          }
        }
      }
    }
  }

  backtrack(0)
  return solutionsFound
}

let unique = 0
let ambiguous = 0
let invalid = 0

for (const level of LEVELS) {
  const count = solve(level)
  if (count === 1) unique++
  else if (count >= 2) ambiguous++
  else invalid++
}

console.log(`valid: ${unique + ambiguous}`)
console.log(`unique: ${unique}`)
console.log(`ambiguous: ${ambiguous}`)
console.log(`invalid: ${invalid}`)
