import * as THREE from 'three'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

function Bird({ speed, phase, y }) {
  const group = useRef()
  const left = useRef()
  const right = useRef()

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (group.current) {
      const x = ((t * speed + phase) % 20) - 10
      group.current.position.set(x, y + Math.sin(t * 0.6 + phase) * 0.3, -12)
    }
    const flap = Math.sin(t * 12 + phase) * 0.6
    if (left.current) left.current.rotation.z = 0.5 + flap
    if (right.current) right.current.rotation.z = -0.5 - flap
  })

  return (
    <group ref={group}>
      <mesh ref={left} position={[-0.05, 0, 0]}>
        <planeGeometry args={[0.3, 0.05]} />
        <meshBasicMaterial color="#2a2a2a" side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={right} position={[0.05, 0, 0]}>
        <planeGeometry args={[0.3, 0.05]} />
        <meshBasicMaterial color="#2a2a2a" side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

export default function Birds() {
  const birds = [
    { speed: 1.2, phase: 0, y: 4 },
    { speed: 1.0, phase: 3, y: 4.6 },
    { speed: 1.4, phase: 7, y: 3.6 },
  ]
  return birds.map((b, i) => <Bird key={i} {...b} />)
}