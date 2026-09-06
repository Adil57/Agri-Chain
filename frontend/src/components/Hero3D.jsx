import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useState, useCallback, useEffect } from 'react'
import GrassField from '../three/GrassField'
import Sky from '../three/Sky'
import SunGlow from '../three/SunGlow'
import Clouds from '../three/Clouds'
import Birds from '../three/Birds'
import Tractor from '../three/Tractor'
import Sprouts from '../three/Sprouts'
import { getDayColors } from '../three/dayCycle'

function CameraRig({ pointerRef }) {
  useFrame(({ camera, clock }) => {
    const targetX = pointerRef.current.x * 1.3
    const targetY = 2.5 + pointerRef.current.y * 0.35 + Math.sin(clock.elapsedTime * 0.3) * 0.05
    camera.position.x += (targetX - camera.position.x) * 0.04
    camera.position.y += (targetY - camera.position.y) * 0.04
    camera.lookAt(0, 0.9, -8)
  })
  return null
}

function LightsAndFog({ scrollRef }) {
  const lightRef = useRef()

  useFrame(({ scene }) => {
    const { light, intensity, bottom } = getDayColors(scrollRef.current)
    if (lightRef.current) {
      lightRef.current.color.copy(light)
      lightRef.current.intensity = intensity
    }
    if (scene.fog) {
      scene.fog.color.copy(bottom)
    }
  })

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight ref={lightRef} position={[5, 8, 3]} intensity={1.4} />
    </>
  )
}

export default function Hero3D({ scrollRef }) {
  const pointerRef = useRef({ x: 0, y: 0 })
  const [sprouts, setSprouts] = useState([])

  const handlePointerMove = useCallback((e) => {
    const cx = e.touches ? e.touches[0].clientX : e.clientX
    const cy = e.touches ? e.touches[0].clientY : e.clientY
    pointerRef.current = {
      x: (cx / window.innerWidth) * 2 - 1,
      y: -((cy / window.innerHeight) * 2 - 1),
    }
  }, [])

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('touchmove', handlePointerMove)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('touchmove', handlePointerMove)
    }
  }, [handlePointerMove])

  const handleGroundTap = (e) => {
    e.stopPropagation()
    const point = e.point
    const id = Date.now() + Math.random()
    setSprouts((prev) => [...prev, { id, x: point.x, z: point.z, born: performance.now() }].slice(-14))
    setTimeout(() => {
      setSprouts((prev) => prev.filter((s) => s.id !== id))
    }, 3600)
  }

  return (
    <div className="fixed inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 2.5, 8], fov: 48 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        <fog attach="fog" args={['#ffe3b0', 8, 27]} />
        <LightsAndFog scrollRef={scrollRef} />
        <Sky scrollRef={scrollRef} />
        <SunGlow scrollRef={scrollRef} />
        <Clouds />
        <Birds />
        <CameraRig pointerRef={pointerRef} />

        <GrassField count={3200} />
        <Tractor />
        <Sprouts sprouts={sprouts} />

        <mesh rotation-x={-Math.PI / 2} position-y={-0.02} onPointerDown={handleGroundTap}>
          <planeGeometry args={[60, 60]} />
          <meshStandardMaterial color="#2d5016" />
        </mesh>
      </Canvas>
    </div>
  )
}