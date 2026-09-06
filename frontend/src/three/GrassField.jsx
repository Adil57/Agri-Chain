import * as THREE from 'three'
import { extend, useFrame } from '@react-three/fiber'
import { shaderMaterial } from '@react-three/drei'
import { useRef, useMemo, useEffect } from 'react'

const GrassMaterial = shaderMaterial(
  {
    uTime: 0,
    uColorBase: new THREE.Color('#234d12'),
    uColorTip: new THREE.Color('#9be05a'),
  },
  `
  attribute float heightFrac;
  attribute float aVariation;
  uniform float uTime;
  varying float vHeightFrac;
  varying float vVariation;

  void main() {
    vHeightFrac = heightFrac;
    vVariation = aVariation;

    vec3 pos = position;
    float phase = aVariation * 6.2831;
    float windPower = heightFrac * heightFrac;
    float sway = sin(uTime * 1.4 + phase) * 0.16 + sin(uTime * 2.4 + phase * 1.8) * 0.07;
    pos.x += sway * windPower;
    pos.z += sway * 0.45 * windPower;

    vec4 worldPosition = instanceMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * worldPosition;
  }
  `,
  `
  uniform vec3 uColorBase;
  uniform vec3 uColorTip;
  varying float vHeightFrac;
  varying float vVariation;

  void main() {
    vec3 color = mix(uColorBase, uColorTip, vHeightFrac);
    float warmth = smoothstep(0.65, 1.0, vVariation);
    vec3 dryColor = vec3(0.82, 0.74, 0.28);
    color = mix(color, dryColor, warmth * 0.22);
    color *= 0.88 + vVariation * 0.28;
    float ao = mix(0.55, 1.0, vHeightFrac);
    color *= ao;
    gl_FragColor = vec4(color, 1.0);
  }
  `
)

extend({ GrassMaterial })

function buildBladeGeometry(segments = 6, height = 0.55, baseWidth = 0.075, curve = 0.42) {
  const positions = []
  const heightFracs = []
  const indices = []

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const y = t * height
    const bend = curve * t * t

    if (i === segments) {
      positions.push(bend, y, 0)
      heightFracs.push(1)
    } else {
      const width = baseWidth * (1 - t * 0.85)
      positions.push(bend - width / 2, y, 0)
      heightFracs.push(t)
      positions.push(bend + width / 2, y, 0)
      heightFracs.push(t)
    }
  }

  for (let i = 0; i < segments - 1; i++) {
    const a = i * 2
    const b = i * 2 + 1
    const c = i * 2 + 2
    const d = i * 2 + 3
    indices.push(a, b, c, b, d, c)
  }

  const lastLevel = (segments - 1) * 2
  const tipIndex = segments * 2
  indices.push(lastLevel, lastLevel + 1, tipIndex)

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('heightFrac', new THREE.Float32BufferAttribute(heightFracs, 1))
  geometry.setIndex(indices)

  return geometry
}

export default function GrassField({ count = 2600 }) {
  const meshRef = useRef()
  const materialRef = useRef()

  const bladeGeometry = useMemo(() => buildBladeGeometry(), [])

  useEffect(() => {
    if (!meshRef.current) return
    const dummy = new THREE.Object3D()
    const variations = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 34
      const z = -Math.random() * 25 - 1.2
      dummy.position.set(x, 0, z)
      dummy.rotation.y = Math.random() * Math.PI
      dummy.rotation.z = (Math.random() - 0.5) * 0.22
      dummy.rotation.x = (Math.random() - 0.5) * 0.1
      const s = 0.75 + Math.random() * 0.65
      dummy.scale.set(s, s * (0.85 + Math.random() * 0.45), s)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
      variations[i] = Math.random()
    }

    meshRef.current.instanceMatrix.needsUpdate = true
    meshRef.current.frustumCulled = false
    bladeGeometry.setAttribute('aVariation', new THREE.InstancedBufferAttribute(variations, 1))
  }, [count, bladeGeometry])

  useFrame((state) => {
    if (materialRef.current) materialRef.current.uTime = state.clock.elapsedTime
  })

  return (
    <instancedMesh ref={meshRef} args={[bladeGeometry, null, count]}>
      <grassMaterial ref={materialRef} side={THREE.DoubleSide} />
    </instancedMesh>
  )
}