import { Canvas, useThree } from "@react-three/fiber"
import { OrbitControls, Text } from "@react-three/drei"
import { Suspense, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import type { GameStatus, Level, Region, RegionDef, Selection } from "../../core/types"
import { normalizeSelection } from "../../core/geometry"
import { createBoardBounds, frameBoard, projectBounds } from "../board-navigation/framing"

const MAT_OCCUPIED = new THREE.MeshStandardMaterial({ color: "#e4dbca", roughness: 0.9 })
const MAT_FREE = new THREE.MeshStandardMaterial({ color: "#f8f3eb", roughness: 0.85 })
const MAT_HINT = new THREE.MeshStandardMaterial({ color: "#e5ad38", transparent: true, opacity: 0.65, depthWrite: false })
// Cobalt accent preview
const MAT_PREVIEW_FILL = new THREE.MeshStandardMaterial({ color: "#2563eb", transparent: true, opacity: 0.28, depthWrite: false })
const MAT_TUTORIAL_GUIDE = new THREE.MeshStandardMaterial({ color: "#2563eb", transparent: true, opacity: 0.25, depthWrite: false })
const REGION_MATS = new Map<string, THREE.Material>()
const getRegionMat = (c: string) => { if(!REGION_MATS.has(c)) REGION_MATS.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.65, metalness: 0.05 })); return REGION_MATS.get(c)! }

const HEIGHT_SCALE = 0.28
const CAMERA_AZIMUTH = Math.PI / 4
const CAMERA_POLAR = 0.95
const CAMERA_PADDING = 0.1
const UNIT_BOX_GEOMETRY = new THREE.BoxGeometry(1, 1, 1)

interface Props {
  level: Level
  regions: Region[]
  hintRegion: RegionDef | null
  boardRevision: number
  gameStatus: GameStatus
  onPlaceRegion: (selection: Selection) => any
  onRemoveRegion: (id: string) => void
  tutorialTarget?: RegionDef | null
  highlightClue?: { row: number; col: number } | null
}

function boxHeight(value: number) {
  return Math.max(0.7, value * HEIGHT_SCALE)
}

function CameraRig({
  level,
  regions,
  controlsRef,
  resetRef,
}: {
  level: Level
  regions: Region[]
  controlsRef: React.MutableRefObject<any>
  resetRef?: React.MutableRefObject<(() => void) | null>
}) {
  const { camera, gl, size, invalidate } = useThree()
  const maxHeight = useMemo(() => Math.max(0.7, ...regions.map((region) => boxHeight(region.clueValue)), ...level.clues.map((clue) => boxHeight(clue.value))), [level.clues, regions])
  const bounds = useMemo(() => createBoardBounds(level.rows, level.cols, maxHeight), [level.cols, level.rows, maxHeight])

  const applyFrame = useCallback(() => {
    if (!(camera instanceof THREE.OrthographicCamera) || size.width < 1 || size.height < 1) return
    const result = frameBoard(bounds, { width: size.width, height: size.height, aspect: size.width / size.height, azimuth: CAMERA_AZIMUTH, polar: CAMERA_POLAR, padding: CAMERA_PADDING })
    camera.position.copy(result.position)
    camera.zoom = result.zoom
    camera.lookAt(result.target)
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
    const projected = projectBounds(bounds, camera)
    const cameraUp = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).normalize()
    const desiredTop = 1 - CAMERA_PADDING
    const desiredBottom = -1 + CAMERA_PADDING
    let verticalCorrection = 0
    if (projected.maxY > desiredTop) verticalCorrection += (projected.maxY - desiredTop) / camera.zoom
    if (projected.minY < desiredBottom) verticalCorrection -= (desiredBottom - projected.minY) / camera.zoom
    if (verticalCorrection) {
      camera.position.addScaledVector(cameraUp, verticalCorrection)
      result.target.addScaledVector(cameraUp, verticalCorrection)
      camera.lookAt(result.target)
      camera.updateMatrixWorld()
    }
    const fitted = projectBounds(bounds, camera)
    const maxNdcExtent = Math.max(Math.abs(fitted.minX), Math.abs(fitted.maxX), Math.abs(fitted.minY), Math.abs(fitted.maxY))
    if (maxNdcExtent > 1 - CAMERA_PADDING) {
      camera.zoom *= (1 - CAMERA_PADDING) / maxNdcExtent
      camera.updateProjectionMatrix()
      camera.updateMatrixWorld()
    }
    gl.domElement.dataset.boardProjectedBounds = JSON.stringify(projectBounds(bounds, camera))
    if (controlsRef.current) {
      controlsRef.current.target.copy(result.target)
      controlsRef.current.update()
    }
    invalidate()
  }, [bounds, camera, gl, invalidate, size.height, size.width, controlsRef])

  if (resetRef) {
    resetRef.current = applyFrame
  }

  const mounted = useRef(false)
  useLayoutEffect(() => {
    if (!mounted.current) { mounted.current = true; applyFrame(); return }
    const timer = setTimeout(applyFrame, 150)
    return () => clearTimeout(timer)
  }, [applyFrame])

  // Capture phase pointerdown check: if user taps on the board, lock rotation hard!
  useEffect(() => {
    const dom = gl.domElement
    const raycaster = new THREE.Raycaster()

    const checkPointOnBoard = (clientX: number, clientY: number) => {
      const rect = dom.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return false
      const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1
      const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1)
      raycaster.setFromCamera({ x: ndcX, y: ndcY }, camera)
      const ray = raycaster.ray
      if (Math.abs(ray.direction.y) > 1e-5) {
        const t = -ray.origin.y / ray.direction.y
        if (t > 0) {
          const hitX = ray.origin.x + t * ray.direction.x
          const hitZ = ray.origin.z + t * ray.direction.z
          const margin = 0.2
          const halfW = level.cols / 2 + margin
          const halfH = level.rows / 2 + margin
          return Math.abs(hitX) <= halfW && Math.abs(hitZ) <= halfH
        }
      }
      return false
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (checkPointOnBoard(event.clientX, event.clientY)) {
        // User touching the board -> lock rotation HARD immediately
        if (controlsRef.current) {
          controlsRef.current.enabled = false
        }
      } else {
        // User touching outside the board -> allow smooth rotation
        if (controlsRef.current) {
          controlsRef.current.enabled = true
        }
      }
    }

    const handlePointerUp = () => {
      if (controlsRef.current) {
        controlsRef.current.enabled = true
      }
    }

    dom.addEventListener("pointerdown", handlePointerDown, { capture: true })
    window.addEventListener("pointerup", handlePointerUp)
    window.addEventListener("pointercancel", handlePointerUp)

    return () => {
      dom.removeEventListener("pointerdown", handlePointerDown, { capture: true })
      window.removeEventListener("pointerup", handlePointerUp)
      window.removeEventListener("pointercancel", handlePointerUp)
    }
  }, [camera, gl.domElement, level.cols, level.rows, controlsRef])

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan={false}
      enableZoom
      enableRotate
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.7}
      zoomSpeed={0.7}
      minPolarAngle={0.45}
      maxPolarAngle={1.32}
      minAzimuthAngle={-Math.PI * 0.9}
      maxAzimuthAngle={Math.PI * 0.9}
      minZoom={Math.max(0.01, camera.zoom * 0.5)}
      maxZoom={Math.max(2, camera.zoom * 2.5)}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      }}
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
      onChange={() => invalidate()}
    />
  )
}

function SharedBox({ children, material }: { children?: React.ReactNode; material?: THREE.Material }) {
  // Blocks are presentation only. The ground interaction plane owns input so
  // Placed meshes can never steal a later pointer raycast.
  return <mesh geometry={UNIT_BOX_GEOMETRY} material={material} raycast={() => null}>{children}</mesh>
}

function CellGrid({ level, regions }: { level: Level; regions: Region[] }) {
  const occupied = useMemo(() => {
    const map = new Set<string>()
    for (const region of regions) for (let row = region.row; row < region.row + region.height; row++) for (let col = region.col; col < region.col + region.width; col++) map.add(`${row},${col}`)
    return map
  }, [regions])
  return <group>{Array.from({ length: level.rows * level.cols }, (_, index) => {
    const row = Math.floor(index / level.cols)
    const col = index % level.cols
    return <SharedBox key={`cell-${row}-${col}`} material={occupied.has(`${row},${col}`) ? MAT_OCCUPIED : MAT_FREE} />
  }).map((mesh, index) => {
    const row = Math.floor(index / level.cols)
    const col = index % level.cols
    return <group key={`cell-position-${row}-${col}`} position={[col + 0.5 - level.cols / 2, -0.055, row + 0.5 - level.rows / 2]} scale={[0.96, 0.1, 0.96]}>{mesh}</group>
  })}</group>
}

function PlacedRegions({ level, regions }: { level: Level; regions: Region[] }) {
  return <group>{regions.map((region) => {
    const height = boxHeight(region.clueValue)
    return <group key={region.id} position={[region.col + region.width / 2 - level.cols / 2, height / 2, region.row + region.height / 2 - level.rows / 2]} scale={[region.width * 0.98, height, region.height * 0.98]}>
      <SharedBox material={getRegionMat(region.color)} />
    </group>
  })}</group>
}

function ClueLabels({
  level,
  regions,
  highlightClue,
}: {
  level: Level
  regions: Region[]
  highlightClue?: { row: number; col: number } | null
}) {
  const regionByCell = useMemo(() => {
    const map = new Map<string, Region>()
    for (const region of regions) {
      for (let row = region.row; row < region.row + region.height; row++) {
        for (let col = region.col; col < region.col + region.width; col++) {
          map.set(`${row},${col}`, region)
        }
      }
    }
    return map
  }, [regions])

  return (
    <group>
      {level.clues.map((clue) => {
        const region = regionByCell.get(`${clue.row},${clue.col}`)
        const isHighlighted = Boolean(
          highlightClue &&
            highlightClue.row === clue.row &&
            highlightClue.col === clue.col,
        )
        const y = region ? boxHeight(region.clueValue) + 0.015 : 0.015

        return (
          <group
            key={`${clue.row}-${clue.col}`}
            position={[
              clue.col + 0.5 - level.cols / 2,
              y,
              clue.row + 0.5 - level.rows / 2,
            ]}
          >
            {/* Clue Number Text attached 2D to board cell */}
            <Text
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.38}
              color={region ? "#1a110a" : isHighlighted ? "#1d4ed8" : "#2e2016"}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.022}
              outlineColor={region ? "#ffffff" : isHighlighted ? "#bfdbfe" : "#ffffff"}
              fontWeight="bold"
              raycast={() => null}
            >
              {clue.value}
            </Text>
          </group>
        )
      })}
    </group>
  )
}

function HintMesh({ level, hintRegion }: { level: Level; hintRegion: RegionDef | null }) {
  if (!hintRegion) return null
  return (
    <group
      position={[
        hintRegion.col + hintRegion.width / 2 - level.cols / 2,
        0.35,
        hintRegion.row + hintRegion.height / 2 - level.rows / 2,
      ]}
      scale={[hintRegion.width, 0.08, hintRegion.height]}
    >
      <SharedBox material={MAT_HINT} />
    </group>
  )
}

function TutorialGuide({ level, target }: { level: Level; target?: RegionDef | null }) {
  if (!target) return null
  const width = target.width
  const depth = target.height
  return (
    <group
      position={[
        target.col + width / 2 - level.cols / 2,
        0.16,
        target.row + depth / 2 - level.rows / 2,
      ]}
      scale={[width * 0.98, 0.22, depth * 0.98]}
    >
      <SharedBox material={MAT_TUTORIAL_GUIDE} />
      <lineSegments>
        <edgesGeometry args={[UNIT_BOX_GEOMETRY]} />
        <lineBasicMaterial color="#3b82f6" />
      </lineSegments>
    </group>
  )
}

function BoardInteraction({
  level,
  regions,
  onPlaceRegion,
  onRemoveRegion,
  gameStatus,
  controlsRef,
}: Omit<Props, "hintRegion" | "boardRevision" | "tutorialTarget" | "highlightClue"> & {
  controlsRef: React.MutableRefObject<any>
}) {
  const [selection, setSelection] = useState<Selection | null>(null)
  const startRef = useRef<{ row: number; col: number } | null>(null)
  const movedRef = useRef(false)
  const selectionRef = useRef<Selection | null>(null)
  const regionByCell = useMemo(() => {
    const map = new Map<string, Region>()
    for (const region of regions) {
      for (let row = region.row; row < region.row + region.height; row++) {
        for (let col = region.col; col < region.col + region.width; col++) {
          map.set(`${row},${col}`, region)
        }
      }
    }
    return map
  }, [regions])

  const cellFromPoint = useCallback(
    (point: THREE.Vector3) => ({
      row: Math.max(0, Math.min(level.rows - 1, Math.floor(point.z + level.rows / 2))),
      col: Math.max(0, Math.min(level.cols - 1, Math.floor(point.x + level.cols / 2))),
    }),
    [level.cols, level.rows],
  )

  const updateSelection = useCallback((cell: { row: number; col: number }) => {
    if (!startRef.current) return
    movedRef.current ||=
      cell.row !== startRef.current.row || cell.col !== startRef.current.col
    const next = {
      startRow: startRef.current.row,
      startCol: startRef.current.col,
      endRow: cell.row,
      endCol: cell.col,
    }
    selectionRef.current = next
    setSelection(next)
  }, [])

  const finish = useCallback(() => {
    const start = startRef.current
    if (!start) return
    const attemptedSelection = selectionRef.current
    if (!movedRef.current) {
      const existing = regionByCell.get(`${start.row},${start.col}`)
      if (existing) onRemoveRegion(existing.id)
    } else if (attemptedSelection) {
      onPlaceRegion(attemptedSelection)
    }
    startRef.current = null
    selectionRef.current = null
    movedRef.current = false
    setSelection(null)
  }, [onPlaceRegion, onRemoveRegion, regionByCell])

  const preview = selection ? normalizeSelection(selection) : null
  const disabled = gameStatus !== "playing"

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={(event) => {
          if (disabled || event.button !== 0 || !event.isPrimary) return
          event.stopPropagation()
          capturePointer(event)
          // Lock rotation HARD as soon as user touches board
          if (controlsRef.current) {
            controlsRef.current.enabled = false
          }
          const cell = cellFromPoint(event.point)
          startRef.current = cell
          movedRef.current = false
          updateSelection(cell)
        }}
        onPointerMove={(event) => {
          if (!startRef.current || disabled) return
          event.stopPropagation()
          updateSelection(cellFromPoint(event.point))
        }}
        onPointerUp={(event) => {
          if (!startRef.current) return
          event.stopPropagation()
          capturePointer(event, true)
          finish()
          if (controlsRef.current) {
            controlsRef.current.enabled = true
          }
        }}
        onPointerCancel={(event) => {
          event.stopPropagation()
          capturePointer(event, true)
          startRef.current = null
          selectionRef.current = null
          movedRef.current = false
          setSelection(null)
          if (controlsRef.current) {
            controlsRef.current.enabled = true
          }
        }}
      >
        <planeGeometry args={[level.cols, level.rows]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {preview && <SelectionPreview rect={preview} level={level} />}
    </>
  )
}

function capturePointer(
  event: { target: EventTarget | null; pointerId: number },
  release = false,
) {
  const target = event.target as (EventTarget & {
    setPointerCapture?: (pointerId: number) => void
    releasePointerCapture?: (pointerId: number) => void
  }) | null
  if (release) target?.releasePointerCapture?.(event.pointerId)
  else target?.setPointerCapture?.(event.pointerId)
}

function SelectionPreview({
  rect,
  level,
}: {
  rect: ReturnType<typeof normalizeSelection>
  level: Level
}) {
  const width = rect.c1 - rect.c0 + 1
  const depth = rect.r1 - rect.r0 + 1
  return (
    <group
      position={[
        rect.c0 + width / 2 - level.cols / 2,
        0.16,
        rect.r0 + depth / 2 - level.rows / 2,
      ]}
    >
      <group scale={[width * 0.98, 0.22, depth * 0.98]}>
        <SharedBox material={MAT_PREVIEW_FILL} />
        <lineSegments>
          <edgesGeometry args={[UNIT_BOX_GEOMETRY]} />
          <lineBasicMaterial color="#1d4ed8" />
        </lineSegments>
      </group>
    </group>
  )
}

function Board3DScene({
  props,
  resetRef,
}: {
  props: Props
  resetRef: React.MutableRefObject<(() => void) | null>
}) {
  const {
    level,
    regions,
    hintRegion,
    gameStatus,
    onPlaceRegion,
    onRemoveRegion,
    tutorialTarget,
    highlightClue,
  } = props
  const controlsRef = useRef<any>(null)

  return (
    <>
      <color attach="background" args={["#faf7f0"]} />
      <ambientLight intensity={1.55} />
      <directionalLight position={[4, 8, 5]} intensity={2.1} />
      <CameraRig
        level={level}
        regions={regions}
        controlsRef={controlsRef}
        resetRef={resetRef}
      />
      <CellGrid level={level} regions={regions} />
      <PlacedRegions level={level} regions={regions} />
      <TutorialGuide level={level} target={tutorialTarget} />
      <ClueLabels level={level} regions={regions} highlightClue={highlightClue} />
      <HintMesh level={level} hintRegion={hintRegion} />
      <BoardInteraction
        level={level}
        regions={regions}
        gameStatus={gameStatus}
        onPlaceRegion={onPlaceRegion}
        onRemoveRegion={onRemoveRegion}
        controlsRef={controlsRef}
      />
    </>
  )
}

export default function Board3DViewport(props: Props) {
  const resetRef = useRef<(() => void) | null>(null)

  return (
    <div
      onContextMenu={(event) => event.preventDefault()}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        position: "relative",
        touchAction: "none",
      }}
    >
      <Canvas
        orthographic
        frameloop="always"
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "default" }}
        camera={{ position: [8, 8, 8], zoom: 1, near: 0.1, far: 100 }}
        onCreated={({ gl }) => {
          gl.domElement.dataset.rendererCount = "1"
        }}
        fallback={
          <div role="alert" style={{ display: "grid", placeItems: "center", height: "100%" }}>
            3D board unavailable
          </div>
        }
      >
        <Suspense fallback={null}>
          <Board3DScene props={props} resetRef={resetRef} />
        </Suspense>
      </Canvas>

      {/* Floating quick button to reset 3D view back to default isometric framing */}
      <button
        type="button"
        onClick={() => resetRef.current?.()}
        className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/90 hover:bg-white text-stone-700 text-xs font-medium shadow-md border border-stone-200/80 backdrop-blur-xs transition-all hover:scale-105 active:scale-95 select-none z-10 cursor-pointer"
        title="Reset 3D camera angle"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-stone-500"
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
        <span>Reset 3D</span>
      </button>
    </div>
  )
}
