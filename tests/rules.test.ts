import { isBoardComplete } from "../src/behaviors/match/completion"
import { validateRectangle } from "../src/behaviors/play-move/moveValidation"

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg)
}

const level = {
  id: 1,
  rows: 3,
  cols: 3,
  clues: [
    { row: 0, col: 0, value: 3 },
    { row: 1, col: 0, value: 2 },
    { row: 1, col: 1, value: 4 },
  ],
  solution: [],
}

// Valid 1x3
assert(
  validateRectangle(
    { startRow: 0, startCol: 0, endRow: 0, endCol: 2 },
    level.clues,
    [],
    3,
    3,
  ).valid === true,
  "Valid 1x3",
)
assert(
  validateRectangle(
    { startRow: -1, startCol: 0, endRow: 1, endCol: 0 },
    level.clues,
    [],
    3,
    3,
  ).reason === "out of bounds",
  "OOB top",
)
assert(
  validateRectangle(
    { startRow: 0, startCol: 1, endRow: 0, endCol: 2 },
    level.clues,
    [],
    3,
    3,
  ).reason === "no clue",
  "No clue",
)
assert(
  validateRectangle(
    { startRow: 0, startCol: 0, endRow: 2, endCol: 0 },
    level.clues,
    [],
    3,
    3,
  ).reason === "multiple clues",
  "Multiple clues",
)
assert(
  validateRectangle(
    { startRow: 0, startCol: 0, endRow: 0, endCol: 1 },
    level.clues,
    [],
    3,
    3,
  ).reason === "wrong area",
  "Wrong area",
)

const baseRegion = {
  id: "1",
  row: 1,
  col: 1,
  width: 2,
  height: 2,
  clueRow: 1,
  clueCol: 1,
  clueValue: 4,
  color: "",
}
assert(
  validateRectangle(
    { startRow: 0, startCol: 1, endRow: 2, endCol: 1 },
    level.clues,
    [baseRegion],
    3,
    3,
  ).reason === "overlap",
  "Overlap vertical",
)
assert(
  validateRectangle(
    { startRow: 0, startCol: 0, endRow: 0, endCol: 2 },
    level.clues,
    [baseRegion],
    3,
    3,
  ).valid === true,
  "Edge touching",
)

// --- completion ---
const validBoardRegions = [
  {
    id: "1",
    row: 0,
    col: 0,
    width: 3,
    height: 1,
    clueRow: 0,
    clueCol: 0,
    clueValue: 3,
    color: "",
  },
  {
    id: "2",
    row: 1,
    col: 0,
    width: 1,
    height: 2,
    clueRow: 1,
    clueCol: 0,
    clueValue: 2,
    color: "",
  },
  {
    id: "3",
    row: 1,
    col: 1,
    width: 2,
    height: 2,
    clueRow: 1,
    clueCol: 1,
    clueValue: 4,
    color: "",
  },
]
assert(isBoardComplete(level, validBoardRegions) === true, "Valid solved")
assert(
  isBoardComplete(level, validBoardRegions.slice(0, 2)) === false,
  "Missing region",
)

const fakeClueRegion = {
  id: "3",
  row: 1,
  col: 1,
  width: 2,
  height: 2,
  clueRow: 2,
  clueCol: 1,
  clueValue: 4,
  color: "",
}
assert(
  isBoardComplete(level, [...validBoardRegions.slice(0, 2), fakeClueRegion]) ===
    false,
  "Fake clue",
)

const regionOOB = {
  id: "3",
  row: 1,
  col: 1,
  width: 3,
  height: 2,
  clueRow: 1,
  clueCol: 1,
  clueValue: 4,
  color: "",
} // area 6 is wrong, let's use area 4 but OOB
// wait, area 4 OOB: row: 2, width: 4, height: 1 -> OOB col
const regionOOB2 = {
  id: "3",
  row: 1,
  col: 2,
  width: 2,
  height: 2,
  clueRow: 1,
  clueCol: 2,
  clueValue: 4,
  color: "",
}
assert(
  isBoardComplete(level, [...validBoardRegions.slice(0, 2), regionOOB2]) ===
    false,
  "OOB region",
)

console.log("ALL PURE GAME RULE TESTS PASSED")
