import * as THREE from "three"

export interface BoardBounds {
  min: THREE.Vector3
  max: THREE.Vector3
}

export interface FramingResult {
  position: THREE.Vector3
  target: THREE.Vector3
  zoom: number
  projectedWidth: number
  projectedHeight: number
  verticalBias: number
}

export interface FramingOptions {
  width: number
  height: number
  aspect: number
  azimuth: number
  polar: number
  padding: number
}

const DIRECTION = new THREE.Vector3()
const RIGHT = new THREE.Vector3()
const UP = new THREE.Vector3()

export function createBoardBounds(rows: number, cols: number, maxHeight: number): BoardBounds {
  return {
    min: new THREE.Vector3(-cols / 2, 0, -rows / 2),
    max: new THREE.Vector3(cols / 2, Math.max(0, maxHeight), rows / 2),
  }
}

function getCorners(bounds: BoardBounds): THREE.Vector3[] {
  const corners: THREE.Vector3[] = []
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) corners.push(new THREE.Vector3(x, y, z))
    }
  }
  return corners
}

function setCameraBasis(azimuth: number, polar: number) {
  DIRECTION.set(Math.sin(polar) * Math.sin(azimuth), Math.cos(polar), Math.sin(polar) * Math.cos(azimuth)).normalize()
  RIGHT.set(Math.cos(azimuth), 0, -Math.sin(azimuth)).normalize()
  UP.crossVectors(RIGHT, DIRECTION).normalize()
}

export function frameBoard(bounds: BoardBounds, options: FramingOptions): FramingResult {
  setCameraBasis(options.azimuth, options.polar)
  const corners = getCorners(bounds)
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  const center = new THREE.Vector3().addVectors(bounds.min, bounds.max).multiplyScalar(0.5)

  for (const corner of corners) {
    const x = corner.dot(RIGHT)
    const y = corner.dot(UP)
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }

  const projectedWidth = Math.max(maxX - minX, 0.001)
  const projectedHeight = Math.max(maxY - minY, 0.001)
  const safeWidth = options.width * (1 - options.padding * 2)
  const safeHeight = options.height * (1 - options.padding * 2)
  const zoom = Math.max(0.01, Math.min((safeWidth / options.aspect) * 2 / projectedWidth, (safeHeight * 2) / projectedHeight))
  const heightRatio = Math.min(1, projectedHeight / Math.max(options.height / zoom, 0.001))
  const verticalBias = Math.min(projectedHeight * 0.18, projectedHeight * heightRatio * 0.16)
  const target = center.clone().addScaledVector(UP, verticalBias)

  return {
    position: target.clone().addScaledVector(DIRECTION, 20),
    target,
    zoom,
    projectedWidth,
    projectedHeight,
    verticalBias,
  }
}

export function projectBounds(bounds: BoardBounds, camera: THREE.OrthographicCamera) {
  return getCorners(bounds).map((point) => point.clone().project(camera)).reduce(
    (result, point) => ({
      minX: Math.min(result.minX, point.x),
      maxX: Math.max(result.maxX, point.x),
      minY: Math.min(result.minY, point.y),
      maxY: Math.max(result.maxY, point.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  )
}
