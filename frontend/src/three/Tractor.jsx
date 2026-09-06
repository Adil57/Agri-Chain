import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

function Wheel({ radius = 0.28, thickness = 0.16, wheelRef }) {
  return (
    <group ref={wheelRef}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, thickness * 0.42, 8, 20]} />
        <meshStandardMaterial color="#181818" roughness={0.9} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius * 0.55, radius * 0.55, thickness * 0.5, 12]} />
        <meshStandardMaterial color="#d97706" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, thickness * 0.26]}>
        <cylinderGeometry args={[radius * 0.14, radius * 0.14, 0.05, 8]} />
        <meshStandardMaterial color="#2b2b2b" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -thickness * 0.26]}>
        <cylinderGeometry args={[radius * 0.14, radius * 0.14, 0.05, 8]} />
        <meshStandardMaterial color="#2b2b2b" />
      </mesh>
    </group>
  )
}

function Mudguard({ radius }) {
  return (
    <mesh rotation={[0, 0, 0]} position={[0, radius * 0.15, 0]}>
      <torusGeometry args={[radius + 0.055, 0.032, 6, 16, Math.PI * 1.05]} />
      <meshStandardMaterial color="#131313" roughness={0.8} />
    </mesh>
  )
}

export default function Tractor() {
  const group = useRef()
  const wheelBL = useRef()
  const wheelBR = useRef()
  const wheelFL = useRef()
  const wheelFR = useRef()

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    if (group.current) {
      group.current.position.x = Math.sin(t * 0.14) * 6.5
      const vel = Math.cos(t * 0.14)
      group.current.scale.x = vel >= 0 ? 1.15 : -1.15
    }
    const spin = delta * 5.5
    ;[wheelBL, wheelBR, wheelFL, wheelFR].forEach((w) => {
      if (w.current) w.current.rotation.x += spin
    })
  })

  return (
    <group ref={group} position={[0, 0.42, -2.4]}>
      {/* Rear axle bar */}
      <mesh position={[-0.18, -0.14, 0]}>
        <boxGeometry args={[0.12, 0.06, 0.72]} />
        <meshStandardMaterial color="#2b2b2b" />
      </mesh>

      {/* Chassis connecting bar */}
      <mesh position={[0.1, -0.1, 0]}>
        <boxGeometry args={[0.75, 0.05, 0.1]} />
        <meshStandardMaterial color="#2b2b2b" />
      </mesh>

      {/* Main body / hood (tapered look using two stacked boxes) */}
      <mesh position={[0.05, 0.16, 0]}>
        <boxGeometry args={[0.95, 0.34, 0.46]} />
        <meshStandardMaterial color="#c1272d" roughness={0.55} metalness={0.15} />
      </mesh>
      <mesh position={[0.42, 0.14, 0]}>
        <boxGeometry args={[0.32, 0.24, 0.4]} />
        <meshStandardMaterial color="#a81f24" roughness={0.55} />
      </mesh>

      {/* Grille */}
      <mesh position={[0.58, 0.14, 0]}>
        <boxGeometry args={[0.03, 0.18, 0.32]} />
        <meshStandardMaterial color="#111" />
      </mesh>

      {/* Headlights */}
      <mesh position={[0.585, 0.2, 0.16]}>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshStandardMaterial color="#fde68a" emissive="#fde68a" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0.585, 0.2, -0.16]}>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshStandardMaterial color="#fde68a" emissive="#fde68a" emissiveIntensity={0.6} />
      </mesh>

      {/* Exhaust pipe */}
      <mesh position={[0.2, 0.5, 0.12]}>
        <cylinderGeometry args={[0.028, 0.028, 0.42, 8]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0.2, 0.72, 0.12]}>
        <cylinderGeometry args={[0.036, 0.036, 0.05, 8]} />
        <meshStandardMaterial color="#161616" />
      </mesh>

      {/* Canopy poles */}
      {[
        [-0.25, 0.5, 0.2],
        [-0.25, 0.5, -0.2],
        [0.28, 0.5, 0.2],
        [0.28, 0.5, -0.2],
      ].map((pos, i) => (
        <mesh key={i} position={pos}>
          <cylinderGeometry args={[0.018, 0.018, 0.62, 6]} />
          <meshStandardMaterial color="#1c1c1c" />
        </mesh>
      ))}

      {/* Canopy roof */}
      <mesh position={[0.02, 0.82, 0]}>
        <boxGeometry args={[0.68, 0.03, 0.55]} />
        <meshStandardMaterial color="#e0a53a" roughness={0.6} />
      </mesh>

      {/* Seat */}
      <mesh position={[-0.15, 0.36, 0]}>
        <boxGeometry args={[0.18, 0.16, 0.24]} />
        <meshStandardMaterial color="#1c1c1c" />
      </mesh>

      {/* Steering column + wheel */}
      <mesh position={[0.05, 0.4, 0]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.012, 0.012, 0.22, 6]} />
        <meshStandardMaterial color="#2b2b2b" />
      </mesh>
      <mesh position={[0.11, 0.5, 0]} rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[0.08, 0.012, 6, 12]} />
        <meshStandardMaterial color="#111" />
      </mesh>

      {/* Rear hitch */}
      <mesh position={[-0.62, -0.12, 0]}>
        <boxGeometry args={[0.16, 0.05, 0.06]} />
        <meshStandardMaterial color="#111" />
      </mesh>

      {/* Rear wheels (big) */}
      <group position={[-0.28, -0.22, 0.34]}>
        <Wheel radius={0.3} thickness={0.2} wheelRef={wheelBL} />
        <Mudguard radius={0.3} />
      </group>
      <group position={[-0.28, -0.22, -0.34]}>
        <Wheel radius={0.3} thickness={0.2} wheelRef={wheelBR} />
      </group>

      {/* Front wheels (small) */}
      <group position={[0.48, -0.28, 0.22]}>
        <Wheel radius={0.15} thickness={0.13} wheelRef={wheelFL} />
        <Mudguard radius={0.15} />
      </group>
      <group position={[0.48, -0.28, -0.22]}>
        <Wheel radius={0.15} thickness={0.13} wheelRef={wheelFR} />
      </group>
    </group>
  )
}