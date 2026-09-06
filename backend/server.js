// server.js — KrishiSetu API (Express + SQLite + JWT)
import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import db from './db.js'
import { gradeImage, hasKeys } from './gemini.js'
import { geocode } from './geocode.js'
import { supabase, ensureBucket, BUCKET } from './supabase.js'

dotenv.config()
const app = express()
const PORT = process.env.PORT || 4000
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret'
const MOQ = 10 // minimum order qty for B2B

// Shipping charge config (flat base + per-km). B2B bulk orders cost more to move.
const SHIPPING = {
  b2b: { base: 350, perKm: 9, label: 'B2B Bulk Freight' },
  b2c: { base: 49, perKm: 4, label: 'B2C Express Delivery' },
}
// fallback straight-line distance (km) between two lat/lng points
function haversineKm(a, b) {
  const R = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const la1 = a.lat * Math.PI / 180, la2 = b.lat * Math.PI / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
function calcShipping(buyerType, farm, dest) {
  const cfg = SHIPPING[buyerType] || SHIPPING.b2c
  const km = Math.max(1, Math.round(haversineKm(farm, dest)))
  const fee = Math.round(cfg.base + cfg.perKm * km)
  return { fee, km, label: cfg.label }
}

// Demo: allow the public tunnel origin (or any origin). For production, lock this
// down to your real frontend domain via CLIENT_ORIGIN in .env.
const ALLOWED = process.env.CLIENT_ORIGIN
app.use(cors({ origin: ALLOWED && ALLOWED !== '*' ? ALLOWED.split(',') : true }))
app.use(express.json({ limit: '12mb' })) // allow base64 crop images

// ---------- helpers ----------
const sign = (u) => jwt.sign({ id: u.id, role: u.role, name: u.name }, JWT_SECRET, { expiresIn: '7d' })
const publicUser = (u) => ({
  id: u.id, name: u.name, email: u.email, role: u.role, org: u.org,
  business_name: u.business_name, rep_name: u.rep_name, contact: u.contact,
  gst: u.gst, address: u.address, bank_name: u.bank_name, bank_account: u.bank_account,
  bank_ifsc: u.bank_ifsc, auth_doc_url: u.auth_doc_url, b2b_approved: u.b2b_approved,
})

function auth(req, res, next) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : null
  if (!token) return res.status(401).json({ error: 'No token' })
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

function notify(userId, role, text, link = '') {
  db.prepare('INSERT INTO notifications (user_id, role, text, link) VALUES (?,?,?,?)').run(userId, role, text, link || '')
}

// ---------- admin auth ----------
const ADMIN_EMAIL = 'admin@agrichain'
const ADMIN_PASSWORD = 'Adil123'
function adminAuth(req, res, next) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : null
  if (!token) return res.status(401).json({ error: 'No token' })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
    req.admin = payload
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
// Admin login (separate from user auth)
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body || {}
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD)
    return res.status(401).json({ error: 'Galat admin credentials' })
  const token = jwt.sign({ id: 0, role: 'admin', name: 'Admin' }, JWT_SECRET, { expiresIn: '12h' })
  res.json({ token, admin: { email: ADMIN_EMAIL, name: 'Admin' } })
})

// ---------- health ----------
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString(), aiGrading: hasKeys() }))

// ---------- AI crop grading (Gemini vision, key-rotated) ----------
app.post('/api/grade', auth, async (req, res) => {
  const { image, mimeType, crop } = req.body || {}
  if (!image) return res.status(400).json({ error: 'image (base64) required' })
  if (!hasKeys()) return res.status(503).json({ error: 'AI grading not configured' })

  // strip a data: URL prefix if the client sent one
  const b64 = String(image).replace(/^data:[^;]+;base64,/, '')
  const result = await gradeImage(b64, mimeType || 'image/jpeg', crop || '')
  if (!result.ok) return res.status(502).json({ error: result.error })
  res.json({ ...result.grade, _model: result.model, _key: result.keyIndex })
})

// ---------- auth ----------
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role, org, city, address,
          business_name, rep_name, auth_doc_url, gst, bank_ifsc, bank_account, bank_name } = req.body || {}
  if (!name || !email || !password || !role)
    return res.status(400).json({ error: 'name, email, password, role required' })
  if (!['farmer', 'b2b', 'b2c'].includes(role))
    return res.status(400).json({ error: 'invalid role' })
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (exists) return res.status(409).json({ error: 'Email already registered' })

  // geocode the full address (or fallback to city) so deliveries use a REAL location
  const geoTarget = address?.trim() || city?.trim() || ''
  let lat = null, lng = null, place = geoTarget
  if (geoTarget) {
    const g = await geocode(geoTarget)
    if (g) { lat = g.lat; lng = g.lng; place = g.place }
  }

  const hash = bcrypt.hashSync(password, 10)
  const info = db.prepare(
    `INSERT INTO users (name,email,password_hash,role,org,address,business_name,rep_name,gst,bank_ifsc,bank_account,bank_name,auth_doc_url)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    name, email, hash, role, org || null, address?.trim() || city?.trim() || '',
    business_name?.trim() || null, rep_name?.trim() || null, gst?.trim() || null,
    bank_ifsc?.trim() || null, bank_account?.trim() || null, bank_name?.trim() || null,
    auth_doc_url?.trim() || null
  )
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid)
  res.json({ token: sign(user), user: publicUser(user) })
})

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'email, password required' })
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Galat email ya password' })
  res.json({ token: sign(user), user: publicUser(user) })
})

app.get('/api/auth/me', auth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ error: 'not found' })
  res.json({ user: publicUser(user) })
})

// shipping rate card (public)
app.get('/api/shipping-rates', (req, res) => {
  res.json({
    b2b: { ...SHIPPING.b2b, gstNote: 'GST extra on goods; shipping is exclusive' },
    b2c: { ...SHIPPING.b2c, gstNote: 'GST inclusive in product price; shipping added at checkout' },
    note: 'Shipping = base + perKm × distance(farm→buyer). Distance computed by straight-line (haversine).',
  })
})

// ---------- listings ----------
app.get('/api/listings', (req, res) => {
  const rows = db.prepare('SELECT * FROM listings ORDER BY id DESC').all()
  res.json(rows)
})

app.post('/api/listings', auth, (req, res) => {
  if (req.user.role !== 'farmer') return res.status(403).json({ error: 'Sirf farmer listing add kar sakta hai' })
  const b = req.body || {}
  if (!b.crop || !b.qty || !b.price)
    return res.status(400).json({ error: 'crop, qty, price required' })
  // AI grading photo is mandatory — the upload used for quality grading must be attached
  if (!b.photo)
    return res.status(400).json({ error: 'Crop photo (used for AI grading) is required to list' })
  const me = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  const seller = `${me.name}${me.org ? ` (${me.org})` : ''}`
  // farm location = farmer's registered address (fallback to default Nashik if not set)
  const farmPlace = me.address || 'Nashik, Maharashtra'
  const farmLat = 19.9975
  const farmLng = 73.7898
  const info = db.prepare(`INSERT INTO listings
    (farmer_id,crop,qty,unit,price,bulk_price,retail_price,min_qty,availability,harvest_date,pickup,grade,moisture,status,bids,seller,farm_place,farm_lat,farm_lng,photo)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?,?,?)`).run(
    req.user.id, b.crop, Number(b.qty), b.unit || 'Quintal', Number(b.price),
    Number(b.bulk_price) || Number(b.price), Number(b.retail_price) || Number(b.price) / (Number(b.qty) || 1),
    Number(b.min_qty) || 5,
    b.availability || 'Available Now', b.harvest_date || '', b.pickup || 'Farm-Gate Pickup',
    b.grade || 'A', b.moisture || '12%', 'Listed', seller, farmPlace, farmLat, farmLng,
    String(b.photo)
  )
  const row = db.prepare('SELECT * FROM listings WHERE id = ?').get(info.lastInsertRowid)
  res.json(row)
})

app.delete('/api/listings/:id', auth, (req, res) => {
  const row = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'not found' })
  if (row.farmer_id !== req.user.id) return res.status(403).json({ error: 'Ye aapki listing nahi hai' })
  db.prepare('DELETE FROM listings WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// bid / RFQ (any logged-in buyer)
app.post('/api/listings/:id/bid', auth, (req, res) => {
  const row = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'not found' })
  const newStatus = row.status === 'Listed' ? 'Bid Received' : row.status
  db.prepare('UPDATE listings SET bids = bids + 1, status = ? WHERE id = ?').run(newStatus, row.id)
  notify(row.farmer_id, 'farmer', `${req.user.name} submitted an RFQ/bid for your ${row.crop} listing`, '/b2b')
  res.json(db.prepare('SELECT * FROM listings WHERE id = ?').get(row.id))
})

// bulk buy (B2B)
app.post('/api/listings/:id/buy', auth, async (req, res) => {
  const row = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'not found' })
  const qty = Number(req.body?.qty || MOQ)
  if (qty < MOQ) return res.status(400).json({ error: `Minimum order quantity ${MOQ} ${row.unit} hai` })
  if (row.qty < qty) return res.status(400).json({ error: 'Itna stock available nahi hai' })

  const remaining = Math.max(0, row.qty - qty)
  const status = remaining === 0 ? 'Sold Out' : 'Order Placed'
  db.prepare('UPDATE listings SET qty = ?, status = ?, bids = bids + 1 WHERE id = ?')
    .run(remaining, status, row.id)

  // delivery location: explicit address in request > buyer's registered city > default
  const me = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  let destPlace = req.body?.address || me.city || 'Pune, Maharashtra'
  let destLat = me.lat ?? 18.5204
  let destLng = me.lng ?? 73.8567
  if (req.body?.address) {
    const g = await geocode(req.body.address)
    if (g) { destPlace = g.place; destLat = g.lat; destLng = g.lng }
  }

  const amount = row.price * qty
  const gst = Math.round(amount * 0.05)
  const ship = calcShipping(req.user.role, { lat: row.farm_lat, lng: row.farm_lng }, { lat: destLat, lng: destLng })
  const oi = db.prepare(`INSERT INTO orders
    (listing_id,buyer_id,buyer_type,qty,unit,amount,gst,status,dest_place,dest_lat,dest_lng,ship_status,shipping)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(row.id, req.user.id, req.user.role, qty, row.unit, amount, gst, 'In Escrow', destPlace, destLat, destLng, 'Preparing', ship.fee)

  notify(row.farmer_id, 'farmer',
    `${req.user.name} placed an order for ${qty} ${row.unit} of ${row.crop} — payment locked in escrow`, '/orders')
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(oi.lastInsertRowid)
  res.json({ order, listing: db.prepare('SELECT * FROM listings WHERE id = ?').get(row.id) })
})

// ---------- B2C checkout (cart of products) ----------
app.post('/api/checkout', auth, (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : []
  if (items.length === 0) return res.status(400).json({ error: 'Cart khaali hai' })
  const summary = items.map((i) => `${i.qty}x ${i.name}`).join(', ')
  const total = items.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0)

  const created = []
  for (const it of items) {
    // resolve the listing this product came from (matched by crop name + price)
    const listing = db.prepare('SELECT * FROM listings WHERE crop = ? AND qty > 0 ORDER BY id DESC LIMIT 1').get(it.name)
    if (!listing) continue
    const qty = Number(it.qty) || 1
    const amount = Number(it.price) * qty
    const gst = Math.round(amount * 0.05)
    const ship = calcShipping(req.user.role, { lat: listing.farm_lat, lng: listing.farm_lng }, { lat: 18.5204, lng: 73.8567 })
    const oi = db.prepare(`INSERT INTO orders
      (listing_id,buyer_id,buyer_type,qty,unit,amount,gst,status,dest_place,dest_lat,dest_lng,ship_status,shipping)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(listing.id, req.user.id, req.user.role, qty, 'kg', amount, gst, 'Order Placed',
           req.user.address || 'Pune, Maharashtra', 18.5204, 73.8567, 'Preparing', ship.fee)
    created.push(oi.lastInsertRowid)
  }

  // Broadcast to all farmers so demo dashboard shows the consumer order
  const farmers = db.prepare("SELECT id FROM users WHERE role = 'farmer'").all()
  farmers.forEach((f) =>
    notify(f.id, 'farmer', `A B2C consumer placed an order: ${summary}. Please allocate stock.`, '/orders'))
  res.json({ ok: true, total, summary, orderIds: created })
})

// ---------- orders ----------
app.get('/api/orders', auth, (req, res) => {
  let rows
  if (req.user.role === 'farmer') {
    rows = db.prepare(`SELECT o.*, l.crop, l.seller, l.unit AS listing_unit, u.name AS buyer_name FROM orders o
      JOIN listings l ON l.id = o.listing_id
      LEFT JOIN users u ON u.id = o.buyer_id
      WHERE l.farmer_id = ? ORDER BY o.id DESC`).all(req.user.id)
  } else {
    rows = db.prepare(`SELECT o.*, l.crop, l.seller, l.unit AS listing_unit FROM orders o
      JOIN listings l ON l.id = o.listing_id WHERE o.buyer_id = ? ORDER BY o.id DESC`).all(req.user.id)
  }
  res.json(rows)
})

// Delete an order (farmer rejects a pending order, or owner cleans up)
app.delete('/api/orders/:id', auth, (req, res) => {
  const order = db.prepare('SELECT o.*, l.farmer_id FROM orders o JOIN listings l ON l.id = o.listing_id WHERE o.id = ?').get(req.params.id)
  if (!order) return res.status(404).json({ error: 'Order not found' })
  if (req.user.role !== 'farmer' || order.farmer_id !== req.user.id)
    return res.status(403).json({ error: 'Sirf listing farmer is order ko hata sakta hai' })
  db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// Escrow summary — computed LIVE from real orders (no hardcoded numbers)
app.get('/api/escrow/summary', auth, (req, res) => {
  // farmer sees money coming to them; buyer sees money they've committed
  const rows = req.user.role === 'farmer'
    ? db.prepare(`SELECT o.status, o.amount, o.gst FROM orders o
        JOIN listings l ON l.id = o.listing_id WHERE l.farmer_id = ?`).all(req.user.id)
    : db.prepare(`SELECT status, amount, gst FROM orders WHERE buyer_id = ?`).all(req.user.id)

  let locked = 0, pending = 0, credited = 0
  for (const o of rows) {
    const total = Number(o.amount) + Number(o.gst || 0)
    if (o.status === 'Farmer Credited') credited += total
    else if (o.status === 'Delivered') pending += total     // delivered, awaiting release
    else locked += total                                    // Order Placed / In Escrow
  }
  res.json({
    locked, pending, credited,
    orders: rows.length,
    currency: 'INR',
  })
})

// Advance an order's status (escrow lifecycle). Buyer confirms delivery; farmer/system releases.
const ORDER_FLOW = ['Order Placed', 'In Escrow', 'Delivered', 'Farmer Credited']
app.post('/api/orders/:id/status', auth, (req, res) => {
  const order = db.prepare('SELECT o.*, l.farmer_id, l.crop FROM orders o JOIN listings l ON l.id = o.listing_id WHERE o.id = ?').get(req.params.id)
  if (!order) return res.status(404).json({ error: 'Order not found' })

  const isBuyer = order.buyer_id === req.user.id
  const isFarmer = order.farmer_id === req.user.id
  if (!isBuyer && !isFarmer) return res.status(403).json({ error: 'Ye order aapka nahi hai' })

  const next = req.body?.status
  if (!ORDER_FLOW.includes(next)) return res.status(400).json({ error: 'Invalid status' })

  // permission: buyer can move up to Delivered; farmer can mark Farmer Credited (release)
  if (next === 'Farmer Credited' && !isFarmer) return res.status(403).json({ error: 'Sirf farmer payment release confirm kar sakta hai' })
  if ((next === 'In Escrow' || next === 'Delivered') && !isBuyer && !isFarmer) return res.status(403).json({ error: 'Not allowed' })

  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(next, order.id)

  // notify the other party
  if (next === 'Delivered') notify(order.farmer_id, 'farmer', `Buyer confirmed delivery of the ${order.crop} order — please release the payment`, '/orders')
  if (next === 'Farmer Credited') notify(order.buyer_id, order.buyer_type, `${order.crop} order complete — payment released to the farmer`, '/orders')

  res.json(db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id))
})

// Single order detail (for invoice) — must belong to the requester
app.get('/api/orders/:id', auth, (req, res) => {
  const o = db.prepare(`SELECT o.*, l.crop, l.seller, l.farmer_id, u.name AS buyer_name, u.email AS buyer_email
    FROM orders o JOIN listings l ON l.id = o.listing_id
    LEFT JOIN users u ON u.id = o.buyer_id WHERE o.id = ?`).get(req.params.id)
  if (!o) return res.status(404).json({ error: 'Order not found' })
  if (o.buyer_id !== req.user.id && o.farmer_id !== req.user.id) return res.status(403).json({ error: 'Not allowed' })
  res.json(o)
})

// ---------- order tracking (map + route + shipment progress) ----------
// Shipment stages mapped to a fraction of the route (0..1) for the truck marker.
const SHIP_STAGES = [
  { key: 'Preparing', label: 'Order Confirmed', frac: 0 },
  { key: 'Picked Up', label: 'Picked from Farm', frac: 0.05 },
  { key: 'In Transit', label: 'In Transit', frac: 0.5 },
  { key: 'Out for Delivery', label: 'Out for Delivery', frac: 0.9 },
  { key: 'Delivered', label: 'Delivered', frac: 1 },
]

// Major Indian agri/logistics hubs (used as the "nearest hub" for shipment routing)
const HUBS = [
  { name: 'Delhi (Azadpur Mandi)', lat: 28.6167, lng: 77.2090 },
  { name: 'Mumbai (APMC Vashi)', lat: 19.0380, lng: 73.0110 },
  { name: 'Nashik (Lasalgaon)', lat: 20.1570, lng: 74.2550 },
  { name: 'Kolkata (Sikderpur)', lat: 22.8500, lng: 88.3900 },
  { name: 'Chennai (Koyambedu)', lat: 13.0700, lng: 80.2100 },
  { name: 'Bengaluru (Yeshwanthpur)', lat: 13.0300, lng: 77.5500 },
  { name: 'Hyderabad (Bowenpally)', lat: 17.4900, lng: 78.4900 },
]
function nearestHub(lat, lng) {
  let best = HUBS[0], bd = Infinity
  for (const h of HUBS) {
    const d = (h.lat - lat) ** 2 + (h.lng - lng) ** 2
    if (d < bd) { bd = d; best = h }
  }
  return best
}

// simple in-memory route cache so we don't hammer OSRM (key: "lat,lng;lat,lng")
const routeCache = new Map()
async function getRoute(a, b) {
  const key = `${a.lng},${a.lat};${b.lng},${b.lat}`
  if (routeCache.has(key)) return routeCache.get(key)
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) })
    const d = await r.json()
    const route = d?.routes?.[0]
    if (!route) return null
    const out = {
      coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]), // leaflet wants [lat,lng]
      distance_km: +(route.distance / 1000).toFixed(1),
      duration_hr: +(route.duration / 3600).toFixed(1),
    }
    routeCache.set(key, out)
    return out
  } catch {
    return null
  }
}

app.get('/api/orders/:id/track', auth, async (req, res) => {
  const o = db.prepare(`SELECT o.*, l.crop, l.seller, l.farmer_id, l.farm_place, l.farm_lat, l.farm_lng,
      u.name AS buyer_name FROM orders o JOIN listings l ON l.id = o.listing_id
      LEFT JOIN users u ON u.id = o.buyer_id WHERE o.id = ?`).get(req.params.id)
  if (!o) return res.status(404).json({ error: 'Order not found' })
  if (o.buyer_id !== req.user.id && o.farmer_id !== req.user.id) return res.status(403).json({ error: 'Not allowed' })

  const farm = { lat: o.farm_lat, lng: o.farm_lng, place: o.farm_place }
  const dest = { lat: o.dest_lat, lng: o.dest_lng, place: o.dest_place }

  // nearest hub -> farm (pickup) -> destination (delivery)
  const hub = nearestHub(farm.lat, farm.lng)
  const leg1 = await getRoute(hub, farm)
  const leg2 = await getRoute(farm, dest)
  let route = null
  if (leg1?.coordinates?.length && leg2?.coordinates?.length) {
    route = {
      coordinates: [...leg1.coordinates, ...leg2.coordinates.slice(1)],
      distance_km: +(leg1.distance_km + leg2.distance_km).toFixed(1),
      duration_hr: +(leg1.duration_hr + leg2.duration_hr).toFixed(1),
    }
  }

  // derive shipment stage from escrow status if ship_status not explicitly advanced
  let shipStatus = o.ship_status || 'Preparing'
  if (o.status === 'Delivered' || o.status === 'Farmer Credited') shipStatus = 'Delivered'

  const stageIdx = Math.max(0, SHIP_STAGES.findIndex((s) => s.key === shipStatus))
  const frac = SHIP_STAGES[stageIdx]?.frac ?? 0

  // truck position = point along the route at `frac`
  let truck = null
  if (route?.coordinates?.length) {
    const idx = Math.min(route.coordinates.length - 1, Math.round(frac * (route.coordinates.length - 1)))
    truck = route.coordinates[idx]
  }

  res.json({
    order_id: o.id,
    crop: o.crop,
    seller: o.seller,
    buyer: o.buyer_name,
    farm,
    dest,
    hub: { name: hub.name, lat: hub.lat, lng: hub.lng },
    route: route || { coordinates: [[farm.lat, farm.lng], [dest.lat, dest.lng]], distance_km: null, duration_hr: null, fallback: true },
    ship_status: shipStatus,
    truck,
    live: (o.live_lat != null && o.live_lng != null) ? { lat: o.live_lat, lng: o.live_lng, at: o.gps_updated_at } : null,
    buyerLive: (o.buyer_lat != null && o.buyer_lng != null) ? { lat: o.buyer_lat, lng: o.buyer_lng, at: o.buyer_gps_at } : null,
    stages: SHIP_STAGES.map((s, i) => ({ ...s, done: i <= stageIdx, current: i === stageIdx })),
  })
})

// advance shipment stage (farmer/seller updates courier progress)
app.post('/api/orders/:id/ship', auth, (req, res) => {
  const o = db.prepare('SELECT o.*, l.farmer_id FROM orders o JOIN listings l ON l.id = o.listing_id WHERE o.id = ?').get(req.params.id)
  if (!o) return res.status(404).json({ error: 'Order not found' })
  if (o.farmer_id !== req.user.id) return res.status(403).json({ error: 'Sirf seller shipment update kar sakta hai' })
  const next = req.body?.ship_status
  if (!SHIP_STAGES.some((s) => s.key === next)) return res.status(400).json({ error: 'Invalid shipment stage' })
  db.prepare('UPDATE orders SET ship_status = ? WHERE id = ?').run(next, o.id)
  notify(o.buyer_id, o.buyer_type, `Your order #${o.id} status: ${next}`, '/orders')
  res.json(db.prepare('SELECT * FROM orders WHERE id = ?').get(o.id))
})

// driver shares live GPS (browser geolocation). Any party with the order can ping.
app.post('/api/orders/:id/gps', auth, (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)
  if (!o) return res.status(404).json({ error: 'Order not found' })
  const { lat, lng, role } = req.body || {}
  if (typeof lat !== 'number' || typeof lng !== 'number') return res.status(400).json({ error: 'lat/lng required' })
  if (role === 'buyer') {
    db.prepare('UPDATE orders SET buyer_lat = ?, buyer_lng = ?, buyer_gps_at = datetime(\'now\') WHERE id = ?').run(lat, lng, o.id)
  } else {
    db.prepare('UPDATE orders SET live_lat = ?, live_lng = ?, gps_updated_at = datetime(\'now\') WHERE id = ?').run(lat, lng, o.id)
  }
  res.json({ ok: true })
})

// GET live GPS (buyer/farmer can watch the moving truck + buyer)
app.get('/api/orders/:id/gps', auth, (req, res) => {
  const o = db.prepare('SELECT live_lat, live_lng, gps_updated_at, buyer_lat, buyer_lng, buyer_gps_at, ship_status FROM orders WHERE id = ?').get(req.params.id)
  if (!o) return res.status(404).json({ error: 'Order not found' })
  res.json(o)
})
app.get('/api/notifications', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 25').all(req.user.id)
  res.json(rows)
})

app.post('/api/notifications/read', auth, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id)
  const rows = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 25').all(req.user.id)
  res.json({ ok: true, notifications: rows })
})

// ---------- payment stub (real Razorpay added when keys arrive) ----------
app.post('/api/payment/create-order', auth, (req, res) => {
  if (!process.env.RAZORPAY_KEY_ID) {
    return res.json({ mock: true, message: 'Razorpay keys not set — demo escrow simulated', amount: req.body?.amount || 0 })
  }
  // TODO: real Razorpay order creation once keys provided
  res.json({ mock: false, message: 'Razorpay integration pending real keys' })
})

// ================= ADMIN PANEL ROUTES =================
// All admin routes require admin token
app.get('/api/admin/stats', adminAuth, (req, res) => {
  const users = db.prepare('SELECT role, COUNT(*) AS n FROM users GROUP BY role').all()
  const orders = db.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(amount+gst),0) AS revenue FROM orders').get()
  const listings = db.prepare('SELECT COUNT(*) AS n FROM listings WHERE status = ?').get('Listed')
  const pendingB2B = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='b2b' AND b2b_approved=0").get()
  res.json({
    users_by_role: users,
    total_orders: orders.n,
    revenue: orders.revenue,
    active_listings: listings.n,
    pending_b2b: pendingB2B.n,
  })
})

app.get('/api/admin/users', adminAuth, (req, res) => {
  const rows = db.prepare('SELECT id,name,email,role,org,business_name,contact,gst,b2b_approved,created_at FROM users ORDER BY id DESC').all()
  res.json(rows)
})
app.delete('/api/admin/users/:id', adminAuth, (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})
app.post('/api/admin/users/:id/approve', adminAuth, (req, res) => {
  const approved = req.body?.approved === false ? 0 : 1
  db.prepare('UPDATE users SET b2b_approved = ? WHERE id = ?').run(approved, req.params.id)
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  notify(u.id, 'b2b', approved ? 'Your B2B business account has been approved!' : 'Your B2B account was not approved.', '/b2b')
  res.json({ ok: true, user: publicUser(u) })
})

app.get('/api/admin/orders', adminAuth, (req, res) => {
  const rows = db.prepare(`SELECT o.*, l.crop, l.seller, u.name AS buyer_name FROM orders o
    JOIN listings l ON l.id = o.listing_id LEFT JOIN users u ON u.id = o.buyer_id ORDER BY o.id DESC`).all()
  res.json(rows)
})
app.delete('/api/admin/orders/:id', adminAuth, (req, res) => {
  db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

app.get('/api/admin/listings', adminAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM listings ORDER BY id DESC').all()
  res.json(rows)
})
app.delete('/api/admin/listings/:id', adminAuth, (req, res) => {
  db.prepare('DELETE FROM listings WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

app.get('/api/admin/b2b-pending', adminAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM users WHERE role='b2b' AND b2b_approved=0 ORDER BY id DESC").all()
  res.json(rows)
})

// ---------- Supabase auth-doc upload + complaints ----------
// Upload a base64 auth document to Supabase Storage, return its public/signed path
async function uploadAuthDoc(userId, base64, mime) {
  if (!supabase) throw new Error('Storage not configured')
  await ensureBucket()
  const clean = String(base64).replace(/^data:[^;]+;base64,/, '')
  const ext = (mime || 'application/pdf').includes('pdf') ? 'pdf' : 'png'
  const path = `auth-docs/${userId}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, Buffer.from(clean, 'base64'), {
    contentType: mime || 'application/pdf', upsert: true,
  })
  if (error) throw new Error(error.message)
  return path
}

// B2B signup with doc upload (replaces register-b2b body handling)
app.post('/api/auth/register-b2b', async (req, res) => {
  const {
    name, email, password, business_name, rep_name, contact, gst,
    address, bank_account, bank_ifsc, bank_name, org, city, auth_doc,
  } = req.body || {}
  if (!name || !email || !password || !business_name)
    return res.status(400).json({ error: 'name, email, password, business_name required' })
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (exists) return res.status(409).json({ error: 'Email already registered' })

  let lat = null, lng = null, place = address || city || ''
  if (address || city) {
    const g = await geocode(address || city)
    if (g) { lat = g.lat; lng = g.lng; place = g.place }
  }

  const hash = bcrypt.hashSync(password, 10)
  const info = db.prepare(`INSERT INTO users
    (name,email,password_hash,role,org,business_name,rep_name,contact,gst,address,bank_account,bank_ifsc,bank_name)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(name, email, hash, 'b2b', org || business_name, business_name, rep_name || '',
         contact || '', gst || '', place, bank_account || '', bank_ifsc || '', bank_name || '')
  let auth_doc_url = ''
  if (auth_doc) {
    try { auth_doc_url = await uploadAuthDoc(info.lastInsertRowid, auth_doc, req.body.mime) }
    catch (e) { console.warn('[supabase] doc upload failed:', e.message) }
    if (auth_doc_url) db.prepare('UPDATE users SET auth_doc_url = ? WHERE id = ?').run(auth_doc_url, info.lastInsertRowid)
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid)
  res.json({ token: sign(user), user: publicUser(user), b2b_pending: true })
})

// Complaints
app.post('/api/complaints', auth, (req, res) => {
  const { order_id, subject, message } = req.body || {}
  if (!subject || !message) return res.status(400).json({ error: 'subject and message required' })
  const info = db.prepare(`INSERT INTO complaints (order_id, user_id, user_role, subject, message, status)
    VALUES (?,?,?,?,?,'Open')`).run(order_id || null, req.user.id, req.user.role, subject, message)
  // notify all admins (here: just log; admin panel polls)
  res.json({ ok: true, id: info.lastInsertRowid })
})
app.get('/api/complaints', auth, (req, res) => {
  // user sees own; admin sees all
  const rows = req.user.role === 'admin'
    ? db.prepare('SELECT * FROM complaints ORDER BY id DESC').all()
    : db.prepare('SELECT * FROM complaints WHERE user_id = ? ORDER BY id DESC').all(req.user.id)
  res.json(rows)
})
app.post('/api/admin/complaints/:id/reply', adminAuth, (req, res) => {
  const { reply, status } = req.body || {}
  db.prepare('UPDATE complaints SET admin_reply = ?, status = ? WHERE id = ?')
    .run(reply || '', status || 'Resolved', req.params.id)
  res.json({ ok: true })
})

// Securely serve a private Supabase auth-doc file (admin only)
app.get('/api/admin/doc-view', adminAuth, async (req, res) => {
  const p = req.query.path
  if (!p || !supabase) return res.status(400).json({ error: 'no path' })
  try {
    const { data, error } = await supabase.storage.from(BUCKET).download(p)
    if (error) return res.status(404).json({ error: error.message })
    const buf = Buffer.from(await data.arrayBuffer())
    const ext = p.endsWith('.pdf') ? 'application/pdf' : 'image/png'
    res.setHeader('Content-Type', ext)
    res.setHeader('Content-Disposition', `inline; filename="${p.split('/').pop()}"`)
    res.send(buf)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.listen(PORT, () => console.log(`[server] KrishiSetu API running on http://localhost:${PORT}`))

