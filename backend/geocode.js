// geocode.js — address -> {lat,lng} via free OpenStreetMap Nominatim (cached, rate-limited)
const cache = new Map()
let lastCall = 0

// Nominatim ToS: max 1 req/sec, needs a real User-Agent
async function throttle() {
  const now = Date.now()
  const wait = Math.max(0, 1100 - (now - lastCall))
  if (wait) await new Promise((r) => setTimeout(r, wait))
  lastCall = Date.now()
}

/**
 * Geocode a free-text address/city (India-biased). Returns {lat,lng,place} or null.
 */
export async function geocode(address) {
  const q = String(address || '').trim()
  if (!q) return null
  const key = q.toLowerCase()
  if (cache.has(key)) return cache.get(key)

  try {
    await throttle()
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=in`
    const r = await fetch(url, {
      headers: { 'User-Agent': 'AgriChain-SIH/1.0 (demo project)' },
      signal: AbortSignal.timeout(12000),
    })
    const d = await r.json()
    if (!Array.isArray(d) || d.length === 0) { cache.set(key, null); return null }
    const out = {
      lat: parseFloat(d[0].lat),
      lng: parseFloat(d[0].lon),
      place: d[0].display_name?.split(',').slice(0, 3).join(',').trim() || q,
    }
    cache.set(key, out)
    return out
  } catch {
    return null
  }
}
