import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'

function makeCloudTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.9)')
  g.addColorStop(0.7, 'rgba(255,255,255,0.35)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(canvas)
}

function CloudPuff({ startX, y, z, speed, scale, tint }) {
  const groupRef = useRef()
  const texture = useMemo(() => makeCloudTexture(), [])

  const blobs = useMemo(() => {
    const n = 5 + Math.floor(Math.random() * 3)
    return Array.from({ length: n }, () => ({
      x: (Math.random() - 0.5) * 2.2,
      y: (Math.random() - 0.5) * 0.5,
      z: (Math.random() - 0.5) * 0.6,
      s: 0.9 + Math.random() * 1.1,
    }))
  }, [])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    groupRef.current.position.x += delta * speed
    if (groupRef.current.position.x > 18) groupRef.current.position.x = -18
  })

  return (
    <group ref={groupRef} position={[startX, y, z]} scale={scale}>
      {blobs.map((b, i) => (
        <sprite key={i} position={[b.x, b.y, b.z]} scale={[b.s * 2.4, b.s * 1.5, 1]}>
          <spriteMaterial
            map={texture}
            transparent
            opacity={0.9}
            color={tint}
            depthWrite={false}
          />
        </sprite>
      ))}
    </group>
  )
}

export default function Clouds() {
  const clouds = useMemo(
    () => [
      { startX: -12, y: 6.2, z: -20, speed: 0.16, scale: 1.3, tint: '#ffffff' },
      { startX: -4, y: 7.6, z: -24, speed: 0.1, scale: 1.7, tint: '#fff8ec' },
      { startX: 4, y: 5.6, z: -17, speed: 0.2, scale: 1.0, tint: '#ffffff' },
      { startX: 11, y: 8.2, z: -27, speed: 0.08, scale: 1.9, tint: '#fff3dd' },
      { startX: -9, y: 5.0, z: -14, speed: 0.22, scale: 0.85, tint: '#ffffff' },
    ],
    []
  )

  return clouds.map((c, i) => <CloudPuff key={i} {...c} />)
}