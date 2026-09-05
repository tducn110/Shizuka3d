import { useState, useEffect, useRef, useCallback } from "react"

export interface CameraRotationOptions {
  autoSway?: boolean
  swaySpeed?: number // Speed of sway oscillation (rad/s)
  swayAmplitude?: number // Max sway amplitude in radians (~20 deg)
  baseAngle?: number // Default camera angle in radians (Math.PI / 4)
}

export function useCameraRotation({
  autoSway = true,
  swaySpeed = 0.7,
  swayAmplitude = 0.38,
  baseAngle = Math.PI / 4,
}: CameraRotationOptions = {}) {
  const [angle, setAngle] = useState(baseAngle)
  const [isSwaying, setIsSwaying] = useState(autoSway)
  const [manualOffset, setManualOffset] = useState(0)
  const startTimeRef = useRef(performance.now())

  useEffect(() => {
    if (!isSwaying) return
    let raf: number
    const tick = () => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000
      // Smooth sinusoidal sway motion: quay qua quay lại
      const sway = Math.sin(elapsed * swaySpeed) * swayAmplitude
      setAngle(baseAngle + manualOffset + sway)
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isSwaying, swaySpeed, swayAmplitude, baseAngle, manualOffset])

  const toggleSway = useCallback(() => {
    setIsSwaying((prev) => {
      if (!prev) startTimeRef.current = performance.now()
      return !prev
    })
  }, [])

  const rotateLeft = useCallback(() => {
    setManualOffset((prev) => prev - Math.PI / 6)
  }, [])

  const rotateRight = useCallback(() => {
    setManualOffset((prev) => prev + Math.PI / 6)
  }, [])

  const resetCamera = useCallback(() => {
    setManualOffset(0)
    setAngle(baseAngle)
    startTimeRef.current = performance.now()
  }, [baseAngle])

  return {
    angle,
    isSwaying,
    toggleSway,
    rotateLeft,
    rotateRight,
    resetCamera,
    setAngle,
  }
}

/**
 * 3D Isometric projection given a center point and rotation angle theta
 */
export function project3D(
  x: number,
  y: number,
  z: number,
  xc: number,
  yc: number,
  theta: number,
  S: number,
) {
  const dx = x - xc
  const dy = y - yc
  const rx = dx * Math.cos(theta) - dy * Math.sin(theta)
  const ry = dx * Math.sin(theta) + dy * Math.cos(theta)
  const sx = rx * S
  const sy = ry * S * 0.5 - z * S
  return { sx, sy, depth: ry }
}

export function formatPt(
  x: number,
  y: number,
  z: number,
  xc: number,
  yc: number,
  theta: number,
  S: number,
) {
  const { sx, sy } = project3D(x, y, z, xc, yc, theta, S)
  return `${sx.toFixed(1)},${sy.toFixed(1)}`
}
