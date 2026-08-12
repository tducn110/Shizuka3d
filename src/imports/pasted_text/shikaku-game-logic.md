Được. Với game này **không nên copy nguyên UI CrazyGames**, mà lấy đúng core gameplay Shikaku rồi dựng thành một web game độc lập, sạch, dễ mở rộng. Quan trọng nhất là agent phải làm đúng **logic hình chữ nhật + diện tích + mỗi vùng đúng 1 clue**, chứ không chỉ dựng UI giống ảnh.

Đây là prompt t nghĩ m có thể ném thẳng vào Codex/Gemini để nó implement:

```text
You are implementing a complete web puzzle game inspired by Shikaku.

Do NOT just reproduce a screenshot.
Implement the actual puzzle rules, interactions, validation, level state, hint system, responsive UI, and game-completion flow.

==================================================
1. GAME CONCEPT
==================================================

Game type: Shikaku logic puzzle.

The player is given a rectangular grid containing several numbered clue cells.

The objective is to divide the entire board into non-overlapping rectangles.

Each final rectangle must:

1. Contain exactly ONE numbered clue cell.
2. Have an area exactly equal to that clue number.
3. Stay completely inside the board.
4. Not overlap another rectangle.
5. Together with all other rectangles, cover the entire playable grid.

Examples:

- clue 3:
  valid rectangle dimensions:
  1x3
  3x1

- clue 4:
  valid:
  1x4
  4x1
  2x2

- clue 6:
  valid:
  1x6
  6x1
  2x3
  3x2

- clue 12:
  valid combinations include:
  1x12
  12x1
  2x6
  6x2
  3x4
  4x3

==================================================
2. PLAYER INPUT
==================================================

Primary control:

LEFT MOUSE DRAG / TOUCH DRAG.

Interaction:

pointer down on one grid cell
→ drag across cells
→ show rectangle preview
→ pointer release
→ attempt to create rectangle.

Important:

Selection must always snap to complete grid cells.

The player does NOT draw freeform paths.

The selected region is determined from:

startCell
endCell

using:

minRow
maxRow
minCol
maxCol

So dragging in ANY direction works:

top-left → bottom-right
bottom-right → top-left
bottom-left → top-right
etc.

Touch input must behave the same way.

Use Pointer Events so mouse and touch share one interaction system.

==================================================
3. RECTANGLE PREVIEW
==================================================

While dragging:

- Highlight all cells inside the prospective rectangle.
- Hide internal grid borders visually so it looks like ONE rectangle.
- Use a soft temporary selection color.
- Show subtle visual feedback.

Preview must NOT immediately modify game state.

When pointer is released, validate the rectangle.

==================================================
4. RECTANGLE VALIDATION
==================================================

Implement a dedicated validation function.

Given:

startRow
startCol
endRow
endCol

calculate:

width = maxCol - minCol + 1
height = maxRow - minRow + 1
area = width * height

Then inspect all cells inside the rectangle.

A rectangle is VALID only when:

- exactly one clue exists inside it
- rectangle area === clue.value
- none of its cells are already owned by another rectangle

Example:

selected area = 2 x 3 = 6

contains exactly:

clue 6

→ valid.

If it contains:

6 + another clue

→ invalid.

If it contains clue 4

→ invalid.

If no clue exists

→ invalid.

If overlapping another completed rectangle

→ invalid.

==================================================
5. INVALID SELECTION FEEDBACK
==================================================

Do not silently fail.

On invalid release:

- briefly tint selected area red
- subtle shake / pop feedback
- then remove preview

No browser alert().
No modal for simple mistakes.
No long error text.

The game should feel immediate.

==================================================
6. VALID RECTANGLE
==================================================

When valid:

create a Region object.

Example:

{
  id,
  row,
  col,
  width,
  height,
  clueRow,
  clueCol,
  clueValue
}

Mark every included board cell with:

regionId

Render the completed rectangle as one visually unified block.

Internal cell borders inside the same region should disappear.

Only the rectangle's outer border remains visible.

The clue number stays visible.

==================================================
7. RECTANGLE COLORS
==================================================

Each completed region receives a soft pastel color.

Example families:

pastel pink
pastel purple
pastel yellow
pastel cyan
pastel green
pastel peach

Do NOT use highly saturated colors.

Color assignment can be deterministic from region/clue index.

Important:

Color is only presentation.
It must never be used to identify regions in game logic.

==================================================
8. EDIT / DELETE REGION
==================================================

The player must be able to correct mistakes.

Recommended interaction:

Click/tap an already completed rectangle
→ select it

Then either:

- clicking it again removes it

OR

- show a small contextual remove action

Prefer the simplest interaction.

Also support:

Undo.

Undo removes the most recently placed rectangle.

Store rectangle placement history.

==================================================
9. COMPLETION CONDITION
==================================================

The puzzle is solved when:

every playable cell belongs to exactly one valid rectangle.

Do NOT determine victory simply from number of regions.

Run:

isBoardComplete()

which verifies:

- every playable cell has regionId
- every region remains valid
- regions do not overlap
- every clue belongs to exactly one region

When solved:

disable drawing temporarily

play a short completion animation

then display compact victory UI:

Puzzle Complete

Continue
Replay

Avoid large text-heavy screens.

==================================================
10. GAME SCREEN UI
==================================================

Use the attached Shikaku screenshot only as general layout inspiration.

Create a clean standalone game.

Layout:

TOP LEFT:
Level 13

TOP RIGHT:
Help button
Settings / pause button

CENTER:
Puzzle board

BOTTOM CENTER:
Hint button

Example:

💡 Hint     3

But DO NOT hardcode emoji/SVG/base64 icons directly inside random component code.

Use the project's existing icon system or asset files if available.

The actual board must dominate the screen.

Avoid:

- sidebars
- CrazyGames navigation
- advertisements
- browser chrome
- unrelated UI
- excessive text
- huge HUD elements

==================================================
11. VISUAL STYLE
==================================================

Visual target:

clean
minimal
soft casual puzzle game
slightly rounded
modern web/mobile game

Background:

warm off-white / very light cream.

Board cells:

white or slightly warm white.

Cells:

small rounded corners.

Subtle shadow:

not strong neumorphism.

Clue text:

dark brown / charcoal.

Completed rectangles:

soft pastel fill.

Board should look similar in visual density to the reference:

simple,
comfortable,
not visually noisy.

==================================================
12. GRID RENDERING
==================================================

Do NOT create dozens of absolutely-positioned magic-number elements.

Board rendering must derive from level configuration.

Recommended model:

type Cell = {
  row: number
  col: number
  clue?: number
  regionId?: string
}

type Clue = {
  row: number
  col: number
  value: number
}

type Level = {
  id: number
  rows: number
  cols: number
  clues: Clue[]
  solution?: RegionDefinition[]
}

Render board dynamically from:

rows
cols
clues

==================================================
13. LEVEL DATA
==================================================

Create at least several levels for testing.

Example difficulty progression:

Level 1:
5x5
very obvious rectangles

Level 2:
5x6

Level 3:
6x6

Level 4:
7x7

later:
8x8
9x9
10x10

Do NOT randomly scatter numbers without guaranteeing that the puzzle is solvable.

For initial implementation:

create solved rectangular partitions first,
then derive clue numbers from them.

Algorithm:

1. Start with full board.
2. Recursively split the board into rectangles.
3. Reject rectangles that are too thin / trivial according to difficulty rules.
4. For every final rectangle:
   area = width * height
5. Select one random cell inside that rectangle as the clue cell.
6. Store the generated solution.
7. Present only clues to player.

This guarantees at least one valid solution.

==================================================
14. IMPORTANT: UNIQUE SOLUTION
==================================================

Initial milestone does NOT need a sophisticated unique-solution generator.

However architecture must allow adding a solver later.

Separate:

level generation
solver
gameplay validation
rendering

Do NOT put all logic inside Game.tsx.

==================================================
15. HINT SYSTEM
==================================================

Add a limited hint count.

Example:

3 hints.

Hint must NOT simply auto-complete half the board randomly.

Recommended hint logic:

Find one currently unsolved clue whose correct rectangle is known from the
level solution.

Then either:

A.
highlight the correct region for ~1.5 sec

or

B.
automatically place ONE correct rectangle.

Prefer A for the first hint press.

Optional second interaction can place it.

Decrease hint count only when a hint is actually shown.

Never hint a region already solved.

==================================================
16. LEVEL RESTART
==================================================

Settings/Pause UI should provide:

Resume
Restart
Sound
Back / Close

Restart:

- removes all player rectangles
- restores hint count
- resets timer if timer exists

Timer is NOT required for MVP.

==================================================
17. RESPONSIVE DESIGN
==================================================

This is a fullscreen responsive web game.

Do not put it inside a fake phone frame.

Desktop:

board centered
max board size should use most available vertical height

Landscape:

board must not become unnecessarily narrow while large unused space exists
on left/right.

Mobile portrait:

board width ≈ available viewport width minus safe padding.

Calculate cell size approximately from:

availableWidth / cols
availableHeight / rows

Use:

cellSize = min(widthConstraint, heightConstraint)

The entire board must remain visible without accidental page scrolling.

Respect:

100dvh
safe-area-inset-*

==================================================
18. GAMEPLAY SIZE
==================================================

The board is the priority.

Target approximately:

desktop:
board uses ~55–70% of usable viewport height

mobile:
board uses as much safe width as possible

Do not make:

Level text,
Hint button,
Settings,

larger than the puzzle itself.

==================================================
19. ANIMATION
==================================================

Keep animation short.

Drag:
immediate.

Valid placement:
100–180ms pop/fade.

Invalid:
150–250ms shake/red flash.

Completion:
400–700ms sequential rectangle pulse.

No long cinematic transitions.

The puzzle should remain responsive.

==================================================
20. SOUND
==================================================

Create hooks / functions for:

selectionStart
validRegion
invalidRegion
removeRegion
hint
levelComplete

If sound assets do not exist:

DO NOT invent/download random assets.

Keep audio abstraction ready but silent.

==================================================
21. ARCHITECTURE
==================================================

Do NOT create one gigantic component.

Suggested architecture:

src/game/shikaku/

  ShikakuGame.tsx

  components/
    GameHUD.tsx
    PuzzleBoard.tsx
    PuzzleCell.tsx
    RegionOverlay.tsx
    HintButton.tsx
    PauseModal.tsx
    CompleteModal.tsx

  engine/
    rectangle.ts
    validation.ts
    completion.ts
    hints.ts
    solver.ts
    generator.ts

  data/
    levels.ts

  hooks/
    useShikakuGame.ts
    useBoardPointer.ts

  types/
    shikaku.types.ts

Exact paths may be adapted to the existing repository.

Do NOT rewrite unrelated project architecture.

==================================================
22. STATE MODEL
==================================================

Keep these concepts separate:

level
board
regions
selection
history
hintCount
gameStatus

Example:

gameStatus:
"playing"
"paused"
"completed"

selection:

{
  startRow,
  startCol,
  endRow,
  endCol
}

regions:

Region[]

history:

string[] // region IDs in placement order

==================================================
23. CORE PURE FUNCTIONS
==================================================

These functions should be testable without rendering:

normalizeSelection()

getRectangleCells()

getRectangleArea()

getCluesInsideRectangle()

hasRegionOverlap()

validateRectangle()

placeRectangle()

removeRectangle()

isBoardComplete()

getPossibleRectanglesForClue()

==================================================
24. TESTS
==================================================

Add unit tests covering at least:

1x3 rectangle with clue 3 → valid

2x3 rectangle with clue 6 → valid

2x3 containing clue 4 → invalid

rectangle containing 0 clues → invalid

rectangle containing 2 clues → invalid

overlapping rectangle → invalid

drag coordinates reversed → normalized correctly

full valid partition → completed

one uncovered cell → not completed

all cells covered but invalid clue ownership → not completed

==================================================
25. UX EDGE CASES
==================================================

Handle:

pointer leaving board during drag

pointercancel

touch scrolling

rapid drag/release

drag beginning on a completed region

window resize during gameplay

restart during selection

level change

React remount

Do not leave stale pointer listeners.

==================================================
26. PERFORMANCE
==================================================

This game does NOT need a heavy rendering engine merely for the grid.

If the existing project is React:

prefer React + CSS Grid / DOM for board UI.

Do NOT introduce PixiJS just for this puzzle unless PixiJS is already a
required project-wide runtime.

Avoid rerendering every unrelated component on pointermove.

During drag, only selection-dependent board state should update.

==================================================
27. CODE QUALITY RULES
==================================================

No:

- giant Game.tsx
- inline base64 assets
- giant SVG strings
- magic pixel positioning
- duplicated rectangle validation
- fake hardcoded visual board
- screenshot tracing
- random generated clues that may be unsolvable
- setInterval gameplay loops
- page reload for Restart
- browser alert()

Keep game rules independent from UI.

==================================================
28. IMPLEMENTATION ORDER
==================================================

Implement in this order:

PHASE 1
Inspect current repository architecture.

PHASE 2
Create types + level model.

PHASE 3
Implement pure rectangle validation.

PHASE 4
Render board.

PHASE 5
Implement pointer drag selection.

PHASE 6
Implement placing/removing regions.

PHASE 7
Completion detection.

PHASE 8
Hint system.

PHASE 9
Pause / restart / completion UI.

PHASE 10
Responsive polish.

PHASE 11
Tests.

PHASE 12
Visual QA.

==================================================
29. ACCEPTANCE CRITERIA
==================================================

Do NOT consider the task finished until all are true:

[ ] Entire board generated from level data.
[ ] Mouse drag works.
[ ] Touch drag works.
[ ] Drag works in all directions.
[ ] Selection snaps to cells.
[ ] Rectangle area is calculated correctly.
[ ] Exactly one clue is required.
[ ] Area must equal clue number.
[ ] Overlap is impossible.
[ ] Valid rectangle visually merges its cells.
[ ] Invalid rectangle gives feedback.
[ ] Player can remove a placed rectangle.
[ ] Undo works.
[ ] Hint works.
[ ] Hint count decreases correctly.
[ ] Entire board completion is detected correctly.
[ ] Victory UI appears.
[ ] Restart resets state.
[ ] Desktop layout is centered and large.
[ ] Mobile layout fits viewport.
[ ] No fake phone/browser frame.
[ ] No horizontal overflow.
[ ] No giant monolithic game component.
[ ] Core validation has tests.
[ ] Build/typecheck/tests pass.

==================================================
30. FINAL OUTPUT REQUIRED FROM YOU
==================================================

After implementation, report:

1. Files created.
2. Files modified.
3. Core architecture.
4. Rectangle validation flow.
5. Pointer interaction flow.
6. Hint implementation.
7. Responsive strategy.
8. Tests added.
9. Commands executed.
10. Remaining limitations.

Do not merely tell me what should be implemented.
Inspect the repository and actually implement it.
```

### Cơ chế cốt lõi m nên khóa cứng

Game này thực tế có loop cực gọn:

```text
LEVEL LOAD
    ↓
Hiển thị grid + clues
    ↓
Pointer Down
    ↓
Pointer Drag
    ↓
Rectangle Preview
    ↓
Pointer Up
    ↓
┌─────────────────────────────┐
│ Tính width × height         │
│ Đếm clue bên trong          │
│ Check overlap               │
└─────────────────────────────┘
    ↓
        VALID?
       ↙      ↘
     NO        YES
     ↓          ↓
 Red flash    Place Region
 Shake        Update board
     ↓          ↓
     └──────→ Check Complete
                    ↓
                  YES
                    ↓
             Puzzle Complete
```

Và có một điểm t rất khuyên m giữ: **đừng dùng PixiJS cho board này nếu repo không bắt buộc**. Shikaku chủ yếu là grid, pointer drag và rectangle logic; React + CSS Grid sẽ sắc nét, responsive dễ hơn, input dễ trace hơn và code ít phức tạp hơn nhiều.

UI thì giữ gần tinh thần ảnh m gửi: **Level ở trái → Help/Settings phải → board cực lớn ở giữa → Hint ở dưới**. Không cần nhét coin, heart, combo, progress bar hay quá nhiều HUD; game logic kiểu này càng sạch càng tốt.
