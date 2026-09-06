// TrackModal.jsx — order tracking with real map (Leaflet + OSM), route (OSRM) and shipment timeline
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Truck, MapPin, Sprout, RefreshCw } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../lib/api'
import { useT } from '../i18n/index.jsx'

// small inline SVG divIcons (no external image assets needed)
const pin = (emoji, bg) => L.divIcon({
  html: `<div style="background:${bg};width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.35);border:2px solid #fff"><span style="transform:rotate(45deg);font-size:16px">${emoji}</span></div>`,
  className: '', iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -32],
})
const truckIcon = L.divIcon({
  html: `<div style="background:#f59e0b;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,.4);border:3px solid #fff;font-size:18px">🚚</div>`,
  className: '', iconSize: [38, 38], iconAnchor: [19, 19],
})

export default function TrackModal({ orderId, canManage, onClose }) {
  const t = useT()
  const mapEl = useRef(null)
  const mapRef = useRef(null)
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [livePos, setLivePos] = useState(null)

  const load = async () => {
    try {
      const d = await api.trackOrder(orderId)
      setData(d)
      return d
    } catch (e) { setErr(e.message) }
  }

  // get user's live GPS location (real-time)
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.watchPosition(
      (pos) => setLivePos([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    )
  }, [])

  // init map once we have data
  useEffect(() => { load() }, [orderId])

  useEffect(() => {
    if (!data || !mapEl.current) return
    if (!mapRef.current) {
      mapRef.current = L.map(mapEl.current, { zoomControl: true, attributionControl: true })
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18, attribution: '© OpenStreetMap',
      }).addTo(mapRef.current)
    }
    const map = mapRef.current
    map.eachLayer((l) => { if (!(l instanceof L.TileLayer)) map.removeLayer(l) })

    const { farm, dest, route, truck } = data
    const line = route?.coordinates?.length ? route.coordinates : [[farm.lat, farm.lng], [dest.lat, dest.lng]]

    L.polyline(line, { color: '#16a34a', weight: 4, opacity: 0.75 }).addTo(map)
    L.marker([farm.lat, farm.lng], { icon: pin('🌾', '#16a34a') }).addTo(map).bindPopup(`<b>Farm</b><br>${farm.place}`)
    L.marker([dest.lat, dest.lng], { icon: pin('🏭', '#2563eb') }).addTo(map).bindPopup(`<b>Buyer</b><br>${dest.place}`)
    if (truck) L.marker(truck, { icon: truckIcon }).addTo(map).bindPopup(`🚚 ${data.ship_status}`)
    // live user position (real-time GPS)
    if (livePos) {
      L.marker(livePos, { icon: pin('📍', '#ef4444') }).addTo(map).bindPopup('You (live)')
    }

    const bounds = L.latLngBounds(line)
    if (livePos) bounds.extend(livePos)
    map.fitBounds(bounds, { padding: [40, 40] })
    setTimeout(() => map.invalidateSize(), 100)
  }, [data, livePos])

  // cleanup map on unmount
  useEffect(() => () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null } }, [])

  const advance = async (stageKey) => {
    setBusy(true)
    try { await api.setShipStatus(orderId, stageKey); await load() }
    catch (e) { setErr(e.message) }
    finally { setBusy(false) }
  }

  const nextStage = data?.stages?.find((s) => !s.done)

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-auto shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 z-[10] p-1.5 rounded-full bg-white/90 hover:bg-black/5 shadow">
          <X size={18} />
        </button>

        <div className="p-6">
          <h2 className="flex items-center gap-2 font-extrabold text-lg text-[#16240a]">
            <Truck size={20} /> {t('Order Tracking')} {data ? `#${data.order_id}` : ''}
          </h2>
          {data && (
            <p className="text-sm text-black/50 mt-1">
              {data.crop} · {data.seller} → {data.buyer}
              {data.route?.distance_km ? ` · ${data.route.distance_km} km, ~${data.route.duration_hr} hr` : ''}
            </p>
          )}
          {err && <p className="text-sm text-red-600 mt-2">{err}</p>}

          {/* MAP */}
          <div ref={mapEl} className="mt-4 rounded-2xl overflow-hidden border border-black/10"
            style={{ height: 300, width: '100%', background: '#eef3e8' }} />

          {/* note */}
          <p className="text-[11px] text-black/35 mt-2">
            🗺️ {t('Real road route via OpenStreetMap. Delivery position is shown from the shipment stage for this prototype demo.')}
          </p>

          {/* TIMELINE */}
          {data?.stages && (
            <div className="mt-5">
              <div className="flex items-center justify-between">
                {data.stages.map((s, i) => (
                  <div key={s.key} className="flex-1 flex flex-col items-center relative">
                    {i > 0 && (
                      <div className={`absolute top-3 right-1/2 w-full h-0.5 ${s.done ? 'bg-emerald-500' : 'bg-black/15'}`} />
                    )}
                    <div className={`relative z-[2] w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold
                      ${s.current ? 'bg-amber-500 text-white ring-4 ring-amber-200' : s.done ? 'bg-emerald-500 text-white' : 'bg-black/10 text-black/40'}`}>
                      {s.done && !s.current ? '✓' : i + 1}
                    </div>
                    <p className={`text-[10px] mt-1.5 text-center leading-tight ${s.current ? 'font-bold text-amber-700' : 'text-black/45'}`}>
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* seller controls to advance shipment */}
          {canManage && data && nextStage && (
            <button disabled={busy} onClick={() => advance(nextStage.key)}
              className="mt-5 w-full py-2.5 rounded-xl bg-[#16240a] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
              {busy ? <RefreshCw size={15} className="animate-spin" /> : <Truck size={15} />}
              {t('Mark')}: {nextStage.label}
            </button>
          )}
          {canManage && data && !nextStage && (
            <p className="mt-5 text-center text-emerald-700 text-sm font-semibold">✓ {t('Delivery complete')}</p>
          )}
        </div>
      </motion.div>
    </div>
  )
}
