import * as THREE from 'three'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { getDayColors } from './dayCycle'

export default function Sky({ scrollRef }) {
  const matRef = useRef()

  useFrame(() => {
    if (!matRef.current) return
    const { top, bottom } = getDayColors(scrollRef.current)
    matRef.current.uniforms.topColor.value.copy(top)
    matRef.current.uniforms.bottomColor.value.copy(bottom)
  })

  return (
    <mesh>
      <sphereGeometry args={[200, 24, 24]} />
      <shaderMaterial
        ref={matRef}
        side={THREE.BackSide}
        uniforms={{
          topColor: { value: new THREE.Color('#fbb6ce') },
          bottomColor: { value: new THREE.Color('#ffe3b0') },
        }}
        vertexShader={`
          varying vec3 vWorldPosition;
          void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 topColor;
          uniform vec3 bottomColor;
          varying vec3 vWorldPosition;
          void main() {
            float h = normalize(vWorldPosition).y;
            gl_FragColor = vec4(mix(bottomColor, topColor, clamp(h * 1.4 + 0.35, 0.0, 1.0)), 1.0);
          }
        `}
      />
    </mesh>
  )
}