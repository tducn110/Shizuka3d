import { Canvas, useThree } from "@react-three/fiber"
import { OrbitControls, Text } from "@react-three/drei"
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import type { GameStatus, Level, Region, RegionDef, Selection } from "../../core/types"
import { normalizeSelection } from "../../core/geometry"
import { createBoardBounds, frameBoard, projectBounds } from "../board-navigation/framing"
import { audioManager } from "../../audio/audioManager"

const MAT_OCCUPIED = new THREE.MeshStandardMaterial({ color: "#e4dbca", roughness: 0.9 })
const MAT_FREE = new THREE.MeshStandardMaterial({ color: "#f8f3eb", roughness: 0.85 })
const MAT_HINT = new THREE.MeshStandardMaterial({ color: "#e5ad38", transparent: true, opacity: 0.65, depthWrite: false })
const MAT_PREVIEW_FILL = new THREE.MeshStandardMaterial({ color: "#2563eb", transparent: true, opacity: 0.28, depthWrite: false })
const MAT_TUTORIAL_GUIDE = new THREE.MeshStandardMaterial({ color: "#2563eb", transparent: true, opacity: 0.25, depthWrite: false })
const MAT_TUTORIAL_REMOVE = new THREE.MeshStandardMaterial({ color: "#ea580c", transparent: true, opacity: 0.35, depthWrite: false })
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
  tutorialMode?: "place" | "remove"
  tutorialPrompt?: string
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
  return (
    <group>
      {regions.map((region) => {
        const height = boxHeight(region.clueValue)
        const posX = region.col + region.width / 2 - level.cols / 2
        const posZ = region.row + region.height / 2 - level.rows / 2
        return (
          <group key={region.id} position={[posX, height / 2, posZ]}>
            <group scale={[region.width * 0.98, height, region.height * 0.98]}>
              <SharedBox material={getRegionMat(region.color)} />
              <lineSegments>
                <edgesGeometry args={[UNIT_BOX_GEOMETRY]} />
                <lineBasicMaterial color="#000000" transparent opacity={0.12} />
              </lineSegments>
            </group>
            {/* Cell divider lines so multi-cell blocks show their constituent cells */}
            {region.width > 1 &&
              Array.from({ length: region.width - 1 }, (_, i) => {
                const x = i + 1 - region.width / 2
                return (
                  <mesh
                    key={`reg-div-x-${i}`}
                    position={[x, height / 2 + 0.003, 0]}
                    scale={[0.022, 0.005, region.height * 0.96]}
                    raycast={() => null}
                  >
                    <boxGeometry args={[1, 1, 1]} />
                    <meshBasicMaterial color="#000000" transparent opacity={0.16} />
                  </mesh>
                )
              })}
            {region.height > 1 &&
              Array.from({ length: region.height - 1 }, (_, i) => {
                const z = i + 1 - region.height / 2
                return (
                  <mesh
                    key={`reg-div-z-${i}`}
                    position={[0, height / 2 + 0.003, z]}
                    scale={[region.width * 0.96, 0.005, 0.022]}
                    raycast={() => null}
                  >
                    <boxGeometry args={[1, 1, 1]} />
                    <meshBasicMaterial color="#000000" transparent opacity={0.16} />
                  </mesh>
                )
              })}
          </group>
        )
      })}
    </group>
  )
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

function TutorialGuide({
  level,
  target,
  mode = "place",
  prompt,
  isDragging = false,
  regions,
}: {
  level: Level
  target?: RegionDef | null
  mode?: "place" | "remove"
  prompt?: string
  isDragging?: boolean
  regions?: Region[]
}) {
  if (!target || isDragging) return null

  // If in place mode, check if target is already placed so guide shuts off immediately
  if (mode === "place" && regions) {
    const isAlreadyPlaced = regions.some(
      (r) =>
        r.row === target.row &&
        r.col === target.col &&
        r.width === target.width &&
        r.height === target.height,
    )
    if (isAlreadyPlaced) return null
  }

  const width = target.width
  const depth = target.height

  if (mode === "remove") {
    return (
      <group
        position={[
          target.col + width / 2 - level.cols / 2,
          0.45,
          target.row + depth / 2 - level.rows / 2,
        ]}
      >
        <group scale={[width * 0.98, 0.16, depth * 0.98]}>
          <SharedBox material={MAT_TUTORIAL_REMOVE} />
          <lineSegments>
            <edgesGeometry args={[UNIT_BOX_GEOMETRY]} />
            <lineBasicMaterial color="#ea580c" />
          </lineSegments>
        </group>
        <Text
          position={[0, 0.35, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.28}
          color="#c2410c"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.025}
          outlineColor="#ffffff"
          fontWeight="bold"
          raycast={() => null}
        >
          {prompt || "👆 Chạm để hủy"}
        </Text>
      </group>
    )
  }

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
  onInteractStateChange,
}: Omit<
  Props,
  | "hintRegion"
  | "boardRevision"
  | "tutorialTarget"
  | "tutorialMode"
  | "tutorialPrompt"
  | "highlightClue"
> & {
  controlsRef: React.MutableRefObject<any>
  onInteractStateChange?: (interacting: boolean) => void
}) {
  const { camera, gl, invalidate } = useThree()
  const [selection, setSelection] = useState<Selection | null>(null)
  const startRef = useRef<{ row: number; col: number } | null>(null)
  const startPosRef = useRef<{ x: number; y: number } | null>(null)
  const movedRef = useRef(false)
  const selectionRef = useRef<Selection | null>(null)
  const isInteractingRef = useRef(false)

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

  const getCellFromCoords = useCallback(
    (clientX: number, clientY: number, clamp = false) => {
      const dom = gl.domElement
      const rect = dom.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return null
      const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1
      const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1)
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)
      const ray = raycaster.ray
      if (Math.abs(ray.direction.y) < 1e-5) return null
      const t = -ray.origin.y / ray.direction.y
      if (t <= 0) return null
      const hitX = ray.origin.x + t * ray.direction.x
      const hitZ = ray.origin.z + t * ray.direction.z

      const rawCol = Math.floor(hitX + level.cols / 2)
      const rawRow = Math.floor(hitZ + level.rows / 2)

      if (clamp) {
        return {
          col: Math.max(0, Math.min(level.cols - 1, rawCol)),
          row: Math.max(0, Math.min(level.rows - 1, rawRow)),
        }
      }

      const margin = 0.25
      const halfW = level.cols / 2 + margin
      const halfH = level.rows / 2 + margin
      if (Math.abs(hitX) <= halfW && Math.abs(hitZ) <= halfH) {
        return {
          col: Math.max(0, Math.min(level.cols - 1, rawCol)),
          row: Math.max(0, Math.min(level.rows - 1, rawRow)),
        }
      }
      return null
    },
    [camera, gl.domElement, level.cols, level.rows],
  )

  useEffect(() => {
    const dom = gl.domElement
    const disabled = gameStatus !== "playing"

    const handlePointerDown = (event: PointerEvent) => {
      if (disabled || event.button !== 0 || !event.isPrimary) return
      const cell = getCellFromCoords(event.clientX, event.clientY, false)
      if (!cell) {
        if (controlsRef.current) {
          controlsRef.current.enabled = true
        }
        return
      }

      if (controlsRef.current) {
        controlsRef.current.enabled = false
      }

      isInteractingRef.current = true
      onInteractStateChange?.(true)
      startRef.current = cell
      startPosRef.current = { x: event.clientX, y: event.clientY }
      movedRef.current = false

      try {
        dom.setPointerCapture(event.pointerId)
      } catch {
        // Ignore
      }

      const initial = {
        startRow: cell.row,
        startCol: cell.col,
        endRow: cell.row,
        endCol: cell.col,
      }
      selectionRef.current = initial
      setSelection(initial)
      invalidate()
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!isInteractingRef.current || !startRef.current) return
      const cell = getCellFromCoords(event.clientX, event.clientY, true)
      if (!cell) return

      const dist = startPosRef.current
        ? Math.hypot(
            event.clientX - startPosRef.current.x,
            event.clientY - startPosRef.current.y,
          )
        : 0

      if (
        dist > 6 ||
        cell.row !== startRef.current.row ||
        cell.col !== startRef.current.col
      ) {
        movedRef.current = true
      }

      const next = {
        startRow: startRef.current.row,
        startCol: startRef.current.col,
        endRow: cell.row,
        endCol: cell.col,
      }
      const prev = selectionRef.current
      if (!prev || prev.endRow !== next.endRow || prev.endCol !== next.endCol) {
        audioManager.playCellTick()
      }
      selectionRef.current = next
      setSelection(next)
      invalidate()
    }

    const handlePointerUp = (event: PointerEvent) => {
      if (!isInteractingRef.current) return

      try {
        dom.releasePointerCapture(event.pointerId)
      } catch {
        // Ignore
      }

      const start = startRef.current
      const attempted = selectionRef.current
      const hasMoved = movedRef.current

      if (start) {
        if (!hasMoved) {
          const existing = regionByCell.get(`${start.row},${start.col}`)
          if (existing) {
            onRemoveRegion(existing.id)
          }
        } else if (attempted) {
          onPlaceRegion(attempted)
        }
      }

      isInteractingRef.current = false
      onInteractStateChange?.(false)
      startRef.current = null
      startPosRef.current = null
      movedRef.current = false
      selectionRef.current = null
      setSelection(null)

      if (controlsRef.current) {
        controlsRef.current.enabled = true
      }
      invalidate()
    }

    const handlePointerCancel = (event: PointerEvent) => {
      if (!isInteractingRef.current) return
      try {
        dom.releasePointerCapture(event.pointerId)
      } catch {
        // Ignore
      }
      isInteractingRef.current = false
      onInteractStateChange?.(false)
      startRef.current = null
      startPosRef.current = null
      movedRef.current = false
      selectionRef.current = null
      setSelection(null)

      if (controlsRef.current) {
        controlsRef.current.enabled = true
      }
      invalidate()
    }

    dom.addEventListener("pointerdown", handlePointerDown, { capture: true })
    window.addEventListener("pointermove", handlePointerMove, { passive: true })
    window.addEventListener("pointerup", handlePointerUp)
    window.addEventListener("pointercancel", handlePointerCancel)

    return () => {
      dom.removeEventListener("pointerdown", handlePointerDown, { capture: true })
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
      window.removeEventListener("pointercancel", handlePointerCancel)
    }
  }, [
    gameStatus,
    getCellFromCoords,
    gl.domElement,
    invalidate,
    onInteractStateChange,
    onPlaceRegion,
    onRemoveRegion,
    regionByCell,
    controlsRef,
  ])

  const preview = selection ? normalizeSelection(selection) : null

  return preview ? <SelectionPreview rect={preview} level={level} /> : null
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
  const count = width * depth
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

      {/* Internal cell dividers so 5 cells clearly show 5 cells */}
      {width > 1 &&
        Array.from({ length: width - 1 }, (_, i) => {
          const x = i + 1 - width / 2
          return (
            <mesh
              key={`prev-div-x-${i}`}
              position={[x, 0.115, 0]}
              scale={[0.025, 0.005, depth * 0.96]}
              raycast={() => null}
            >
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color="#1d4ed8" transparent opacity={0.6} />
            </mesh>
          )
        })}
      {depth > 1 &&
        Array.from({ length: depth - 1 }, (_, i) => {
          const z = i + 1 - depth / 2
          return (
            <mesh
              key={`prev-div-z-${i}`}
              position={[0, 0.115, z]}
              scale={[width * 0.96, 0.005, 0.025]}
              raycast={() => null}
            >
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color="#1d4ed8" transparent opacity={0.6} />
            </mesh>
          )
        })}

      {/* Floating cell count label when dragging multiple cells */}
      {count > 1 && (
        <Text
          position={[0, 0.28, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.34}
          color="#1d4ed8"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.025}
          outlineColor="#ffffff"
          fontWeight="bold"
          raycast={() => null}
        >
          {count}
        </Text>
      )}
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
    tutorialMode,
    tutorialPrompt,
    highlightClue,
  } = props
  const controlsRef = useRef<any>(null)
  const [isInteracting, setIsInteracting] = useState(false)

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
      <TutorialGuide
        level={level}
        target={tutorialTarget}
        mode={tutorialMode}
        prompt={tutorialPrompt}
        isDragging={isInteracting}
        regions={regions}
      />
      <ClueLabels level={level} regions={regions} highlightClue={highlightClue} />
      <HintMesh level={level} hintRegion={hintRegion} />
      <BoardInteraction
        level={level}
        regions={regions}
        gameStatus={gameStatus}
        onPlaceRegion={onPlaceRegion}
        onRemoveRegion={onRemoveRegion}
        controlsRef={controlsRef}
        onInteractStateChange={setIsInteracting}
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
