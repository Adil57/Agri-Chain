import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { getDayColors } from './dayCycle'

function makeGlowTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.4, 'rgba(255,220,150,0.6)')
  g.addColorStop(1, 'rgba(255,220,150,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(canvas)
}

export default function SunGlow({ scrollRef }) {
  const spriteRef = useRef()
  const texture = useMemo(() => makeGlowTexture(), [])

  useFrame(() => {
    if (!spriteRef.current) return
    const p = scrollRef.current
    const { sun } = getDayColors(p)
    const x = (p - 0.5) * 22
    const y = Math.sin(p * Math.PI) * 7 + 1.5
    spriteRef.current.position.set(x, y, -30)
    spriteRef.current.material.color.copy(sun)
  })

  return (
    <sprite ref={spriteRef} scale={[6, 6, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </sprite>
  )
}