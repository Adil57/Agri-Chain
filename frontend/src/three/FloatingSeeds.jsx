import * as THREE from 'three'
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'

function createSoftTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(255,248,220,0.9)')
  gradient.addColorStop(0.4, 'rgba(255,240,190,0.5)')
  gradient.addColorStop(1, 'rgba(255,240,190,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(canvas)
}

export default function FloatingSeeds({ count = 40 }) {
  const pointsRef = useRef()
  const texture = useMemo(() => createSoftTexture(), [])

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 20
      arr[i * 3 + 1] = Math.random() * 5
      arr[i * 3 + 2] = -Math.random() * 20 - 1
    }
    return arr
  }, [count])

  useFrame((state, delta) => {
    if (!pointsRef.current) return
    const pos = pointsRef.current.geometry.attributes.position.array
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] += delta * 0.2
      pos[i * 3] += Math.sin(state.clock.elapsedTime * 0.5 + i) * 0.0015
      if (pos[i * 3 + 1] > 5) pos[i * 3 + 1] = 0
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.25}
        map={texture}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}