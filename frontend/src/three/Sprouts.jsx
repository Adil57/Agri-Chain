import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

function Sprout({ x, z, born }) {
  const group = useRef()

  useFrame(() => {
    if (!group.current) return
    const age = (performance.now() - born) / 1000
    let s = 0.0001
    if (age < 0.4) s = age / 0.4
    else if (age < 2.8) s = 1
    else if (age < 3.4) s = 1 - (age - 2.8) / 0.6
    group.current.scale.setScalar(Math.max(s, 0.0001))
  })

  return (
    <group ref={group} position={[x, 0, z]}>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.02, 0.025, 0.3, 5]} />
        <meshStandardMaterial color="#4d7c0f" />
      </mesh>
      <mesh position={[0, 0.32, 0]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.4} />
      </mesh>
    </group>
  )
}

export default function Sprouts({ sprouts }) {
  return sprouts.map((s) => <Sprout key={s.id} x={s.x} z={s.z} born={s.born} />)
}