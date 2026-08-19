import { isBoardComplete } from "../src/game/engine/completion"
import {
  validateRectangle,
  hasRegionOverlap,
} from "../src/game/engine/validation"
import { normalizeSelection } from "../src/game/engine/rectangle"

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg)
}

const level = {
  id: 1,
  rows: 2,
  cols: 2,
  clues: [
    { row: 0, col: 0, value: 2 },
    { row: 1, col: 1, value: 2 },
  ],
  solution: [],
}

// 1. Valid rectangle
const sel1 = { startRow: 0, startCol: 0, endRow: 1, endCol: 0 } // 2x1
const res1 = validateRectangle(sel1, level.clues, [], 2, 2)
assert(res1.valid === true, "Valid 2x1 rectangle should be accepted")

// 2. Out of bounds
const selOOB = { startRow: -1, startCol: 0, endRow: 1, endCol: 0 }
const resOOB = validateRectangle(selOOB, level.clues, [], 2, 2)
assert(
  resOOB.valid === false && resOOB.reason === "out of bounds",
  "OOB rejected",
)

// 3. Overlap
const regions = [
  {
    id: "1",
    row: 0,
    col: 0,
    width: 1,
    height: 2,
    clueRow: 0,
    clueCol: 0,
    clueValue: 2,
    color: "",
  },
]
const selOverlap = { startRow: 0, startCol: 0, endRow: 0, endCol: 1 } // 1x2 overlapping (0,0)
const resOverlap = validateRectangle(selOverlap, level.clues, regions, 2, 2)
assert(
  resOverlap.valid === false && resOverlap.reason === "overlap",
  "Overlap rejected",
)

// 4. No clue
const selNoClue = { startRow: 0, startCol: 1, endRow: 1, endCol: 1 } // Wait, this has clue at 1,1
const selRealNoClue = { startRow: 0, startCol: 1, endRow: 0, endCol: 1 } // 1x1 at 0,1. No clue.
const resNoClue = validateRectangle(selRealNoClue, level.clues, [], 2, 2)
assert(
  resNoClue.valid === false && resNoClue.reason === "no clue",
  "No clue rejected",
)

// 5. Multiple clues
const selMulti = { startRow: 0, startCol: 0, endRow: 1, endCol: 1 } // 2x2 has 2 clues
const resMulti = validateRectangle(selMulti, level.clues, [], 2, 2)
assert(
  resMulti.valid === false && resMulti.reason === "multiple clues",
  "Multiple clues rejected",
)

// 6. Wrong area
const selWrongArea = { startRow: 1, startCol: 1, endRow: 1, endCol: 1 } // 1x1 has clue 2
const resWrongArea = validateRectangle(selWrongArea, level.clues, [], 2, 2)
assert(
  resWrongArea.valid === false && resWrongArea.reason === "wrong area",
  "Wrong area rejected",
)

// 7. Completion
const fullRegions = [
  {
    id: "1",
    row: 0,
    col: 0,
    width: 1,
    height: 2,
    clueRow: 0,
    clueCol: 0,
    clueValue: 2,
    color: "",
  },
  {
    id: "2",
    row: 0,
    col: 1,
    width: 1,
    height: 2,
    clueRow: 1,
    clueCol: 1,
    clueValue: 2,
    color: "",
  },
]
assert(
  isBoardComplete(level, fullRegions) === true,
  "Full regions should complete board",
)

// 8. Incomplete
assert(
  isBoardComplete(level, [fullRegions[0]]) === false,
  "Missing region is not complete",
)

console.log("ALL PURE GAME RULE TESTS PASSED")
