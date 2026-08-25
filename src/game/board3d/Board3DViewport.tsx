import { Canvas, useThree } from "@react-three/fiber"
import { OrbitControls, Text } from "@react-three/drei"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import type { GameStatus, Level, Region, RegionDef, Selection } from "../types/shikaku.types"
import { normalizeSelection } from "../engine/rectangle"
import { createBoardBounds, frameBoard, projectBounds } from "./framing"

const MAT_OCCUPIED = new THREE.MeshStandardMaterial({ color: "#ece4d4", roughness: 0.9 })
const MAT_FREE = new THREE.MeshStandardMaterial({ color: "#f5f0e6", roughness: 0.9 })
const MAT_HINT = new THREE.MeshStandardMaterial({ color: "#e5ad38", transparent: true, opacity: 0.65, depthWrite: false })
const MAT_BUILT = new THREE.MeshStandardMaterial({ color: "#e8d1c8", roughness: 0.72, transparent: true, opacity: 0.86 })
const MAT_PREVIEW = new THREE.MeshStandardMaterial({ color: "#7394e8", transparent: true, opacity: 0.45, depthWrite: false })
const REGION_MATS = new Map<string, THREE.Material>()
const getRegionMat = (c: string) => { if(!REGION_MATS.has(c)) REGION_MATS.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.68 })); return REGION_MATS.get(c)! }

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
  onPlaceRegion: (selection: Selection) => boolean
  onRemoveRegion: (id: string) => void
}

function boxHeight(value: number) {
  return Math.max(0.7, value * HEIGHT_SCALE)
}

function CameraRig({ level, regions }: { level: Level; regions: Region[] }) {
  const { camera, gl, size, invalidate } = useThree()
  const controlsRef = useRef<any>(null)
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
  }, [bounds, camera, gl, invalidate, size.height, size.width])

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
      rotateSpeed={0.55}
      zoomSpeed={0.7}
      minPolarAngle={0.62}
      maxPolarAngle={1.28}
      minAzimuthAngle={-Math.PI * 0.85}
      maxAzimuthAngle={Math.PI * 0.85}
      minZoom={Math.max(0.01, camera.zoom * 0.55)}
      maxZoom={Math.max(2, camera.zoom * 2.2)}
      mouseButtons={{ LEFT: undefined, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
      touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.ROTATE }}
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

function ClueLabels({ level, regions }: { level: Level; regions: Region[] }) {
  const regionByCell = useMemo(() => {
    const map = new Map<string, Region>()
    for (const region of regions) for (let row = region.row; row < region.row + region.height; row++) for (let col = region.col; col < region.col + region.width; col++) map.set(`${row},${col}`, region)
    return map
  }, [regions])

  return <group>{level.clues.map((clue) => {
    const region = regionByCell.get(`${clue.row},${clue.col}`)
    const y = region ? boxHeight(region.clueValue) + 0.04 : 0.08
    return <Text key={`${clue.row}-${clue.col}`} position={[clue.col + 0.5 - level.cols / 2, y, clue.row + 0.5 - level.rows / 2]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.34} color="#4d3b2c" anchorX="center" anchorY="middle" outlineWidth={0.015} outlineColor="#fffdf8">{clue.value}</Text>
  })}</group>
}

function HintMesh({ level, hintRegion }: { level: Level; hintRegion: RegionDef | null }) {
  if (!hintRegion) return null
  return <group position={[hintRegion.col + hintRegion.width / 2 - level.cols / 2, 0.4, hintRegion.row + hintRegion.height / 2 - level.rows / 2]} scale={[hintRegion.width, 0.08, hintRegion.height]}><SharedBox material={MAT_HINT} /></group>
}

function BoardInteraction({ level, regions, boardRevision, gameStatus, onPlaceRegion, onRemoveRegion }: Omit<Props, "hintRegion">) {
  const [selection, setSelection] = useState<Selection | null>(null)
  const [builtSelections, setBuiltSelections] = useState<Selection[]>([])
  const startRef = useRef<{ row: number; col: number } | null>(null)
  const movedRef = useRef(false)
  const selectionRef = useRef<Selection | null>(null)
  const regionByCell = useMemo(() => {
    const map = new Map<string, Region>()
    for (const region of regions) for (let row = region.row; row < region.row + region.height; row++) for (let col = region.col; col < region.col + region.width; col++) map.set(`${row},${col}`, region)
    return map
  }, [regions])

  // Blocks that do not yet belong to the solved domain are still real visual
  // builds for this screen. They reset only with the board lifecycle.
  useEffect(() => {
    setBuiltSelections([])
  }, [boardRevision, level.id])

  const cellFromPoint = useCallback((point: THREE.Vector3) => ({ row: Math.max(0, Math.min(level.rows - 1, Math.floor(point.z + level.rows / 2))), col: Math.max(0, Math.min(level.cols - 1, Math.floor(point.x + level.cols / 2))) }), [level.cols, level.rows])
  const updateSelection = useCallback((cell: { row: number; col: number }) => {
    if (!startRef.current) return
    movedRef.current ||= cell.row !== startRef.current.row || cell.col !== startRef.current.col
    const next = { startRow: startRef.current.row, startCol: startRef.current.col, endRow: cell.row, endCol: cell.col }
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
    } else if (attemptedSelection && !onPlaceRegion(attemptedSelection)) {
      // Keep every build visible. The domain decides completion separately;
      // this visual block can be clicked later to free its occupied cells.
      setBuiltSelections((current) => [...current, attemptedSelection].slice(-8))
    }
    startRef.current = null
    selectionRef.current = null
    movedRef.current = false
    setSelection(null)
  }, [onPlaceRegion, onRemoveRegion, regionByCell])
  const preview = selection ? normalizeSelection(selection) : null
  const disabled = gameStatus !== "playing"
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} onPointerDown={(event) => { if (disabled || event.button !== 0) return; event.stopPropagation(); capturePointer(event); const cell = cellFromPoint(event.point); startRef.current = cell; movedRef.current = false; updateSelection(cell) }} onPointerMove={(event) => { if (!startRef.current || disabled) return; event.stopPropagation(); updateSelection(cellFromPoint(event.point)) }} onPointerUp={(event) => { if (!startRef.current) return; event.stopPropagation(); capturePointer(event, true); finish() }} onPointerCancel={(event) => { event.stopPropagation(); capturePointer(event, true); startRef.current = null; selectionRef.current = null; movedRef.current = false; setSelection(null) }}>
      <planeGeometry args={[level.cols, level.rows]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
    {builtSelections.map((builtSelection, index) => <BuiltBlock key={`built-${index}`} rect={normalizeSelection(builtSelection)} level={level} onRemove={() => setBuiltSelections((current) => current.filter((_, itemIndex) => itemIndex !== index))} />)}
    {preview && <SelectionPreview rect={preview} level={level} />}
  </>
}

function BuiltBlock({ rect, level, onRemove }: { rect: ReturnType<typeof normalizeSelection>; level: Level; onRemove: () => void }) {
  const width = rect.c1 - rect.c0 + 1
  const depth = rect.r1 - rect.r0 + 1
  const height = Math.max(0.55, Math.min(1.4, Math.sqrt(rect.area) * 0.22))
  return <group position={[rect.c0 + width / 2 - level.cols / 2, height / 2, rect.r0 + depth / 2 - level.rows / 2]} scale={[width * 0.96, height, depth * 0.96]}>
    <mesh geometry={UNIT_BOX_GEOMETRY} material={MAT_BUILT} onPointerDown={(event) => { event.stopPropagation(); onRemove() }} />
  </group>
}

function capturePointer(event: { target: EventTarget | null; pointerId: number }, release = false) {
  const target = event.target as (EventTarget & {
    setPointerCapture?: (pointerId: number) => void
    releasePointerCapture?: (pointerId: number) => void
  }) | null
  if (release) target?.releasePointerCapture?.(event.pointerId)
  else target?.setPointerCapture?.(event.pointerId)
}

function SelectionPreview({ rect, level }: { rect: ReturnType<typeof normalizeSelection>; level: Level }) {
  const width = rect.c1 - rect.c0 + 1
  const depth = rect.r1 - rect.r0 + 1
  return <group position={[rect.c0 + width / 2 - level.cols / 2, 0.16, rect.r0 + depth / 2 - level.rows / 2]} scale={[width * 0.98, 0.25, depth * 0.98]}><SharedBox material={MAT_PREVIEW} /></group>
}

function Board3DScene({ props }: { props: Props }) {
  const { level, regions, hintRegion, boardRevision, gameStatus, onPlaceRegion, onRemoveRegion } = props
  return <>
    <color attach="background" args={["#faf7f0"]} />
    <ambientLight intensity={1.55} /><directionalLight position={[4, 8, 5]} intensity={2.1} />
    <CameraRig level={level} regions={regions} />
    <CellGrid level={level} regions={regions} /><PlacedRegions level={level} regions={regions} /><ClueLabels level={level} regions={regions} /><HintMesh level={level} hintRegion={hintRegion} />
    <BoardInteraction level={level} regions={regions} boardRevision={boardRevision} gameStatus={gameStatus} onPlaceRegion={onPlaceRegion} onRemoveRegion={onRemoveRegion} />
  </>
}

export default function Board3DViewport(props: Props) {
  return <div onContextMenu={(event) => event.preventDefault()} style={{ width: "100%", height: "100%", minHeight: 0, position: "relative", touchAction: "none" }}>
    <Canvas orthographic frameloop="demand" dpr={[1, 1.75]} gl={{ antialias: true, powerPreference: "high-performance" }} camera={{ position: [8, 8, 8], zoom: 1, near: 0.1, far: 100 }} onCreated={({ gl }) => { gl.domElement.dataset.rendererCount = "1" }} fallback={<div role="alert" style={{ display: "grid", placeItems: "center", height: "100%" }}>3D board unavailable</div>}>
      <Board3DScene props={props} />
    </Canvas>
  </div>
}
