import * as THREE from 'three'

const stops = [
  { p: 0, top: '#fbb6ce', bottom: '#ffe3b0', sun: '#ffb37b', light: '#ffd9a0', intensity: 1.1 },
  { p: 0.5, top: '#4fa8e0', bottom: '#eaf6ff', sun: '#fff6d8', light: '#ffffff', intensity: 1.6 },
  { p: 1, top: '#2d1b4e', bottom: '#ff8a4c', sun: '#ff7043', light: '#ffb37b', intensity: 0.9 },
]

function lerpColor(hexA, hexB, t) {
  const a = new THREE.Color(hexA)
  const b = new THREE.Color(hexB)
  return a.clone().lerp(b, t)
}

export function getDayColors(progress) {
  const p = Math.min(Math.max(progress, 0), 1)
  let from = stops[0]
  let to = stops[1]
  let t = p / 0.5

  if (p > 0.5) {
    from = stops[1]
    to = stops[2]
    t = (p - 0.5) / 0.5
  }

  return {
    top: lerpColor(from.top, to.top, t),
    bottom: lerpColor(from.bottom, to.bottom, t),
    sun: lerpColor(from.sun, to.sun, t),
    light: lerpColor(from.light, to.light, t),
    intensity: from.intensity + (to.intensity - from.intensity) * t,
  }
}