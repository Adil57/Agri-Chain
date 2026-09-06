// smoke-test.js — full end-to-end API test, token stays internal
const B = 'http://localhost:4000'
const j = (r) => r.json()
let pass = 0, fail = 0
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`) }
  else { fail++; console.log(`  FAIL  ${name}  ${extra}`) }
}

const post = (path, body, token) =>
  fetch(B + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
const get = (path, token) =>
  fetch(B + path, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
const del = (path, token) =>
  fetch(B + path, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })

const run = async () => {
  console.log('\n== AUTH ==')
  let r = await get('/api/health'); ok('health 200', r.status === 200)

  // register a fresh B2B buyer
  const email = `buyer_${Date.now()}@test.in`
  r = await post('/api/auth/register', { name: 'Test Mills', email, password: 'pass1234', role: 'b2b', org: 'Pune' })
  const reg = await j(r)
  ok('register returns token', r.status === 200 && !!reg.token)
  const buyerToken = reg.token

  // duplicate email -> 409
  r = await post('/api/auth/register', { name: 'x', email, password: 'y', role: 'b2b' })
  ok('duplicate email rejected (409)', r.status === 409)

  // wrong password -> 401
  r = await post('/api/auth/login', { email: 'ramesh@demo.in', password: 'nope' })
  ok('wrong password rejected (401)', r.status === 401)

  // farmer login
  r = await post('/api/auth/login', { email: 'ramesh@demo.in', password: 'demo1234' })
  const flog = await j(r); const farmerToken = flog.token
  ok('farmer login ok', r.status === 200 && !!farmerToken)

  // /me with valid token
  r = await get('/api/auth/me', farmerToken); const me = await j(r)
  ok('me returns farmer', r.status === 200 && me.user?.role === 'farmer', JSON.stringify(me))

  // /me without token -> 401
  r = await get('/api/auth/me'); ok('me without token -> 401', r.status === 401)

  console.log('\n== LISTINGS ==')
  r = await get('/api/listings'); const before = await j(r)
  ok('listings public list', Array.isArray(before), '')

  // farmer creates a listing
  r = await post('/api/listings', { crop: 'Pyaz', qty: 80, price: 1500, grade: 'A', moisture: '13%' }, farmerToken)
  const created = await j(r)
  ok('farmer creates listing', r.status === 200 && created.id > 0, JSON.stringify(created))
  const listingId = created.id

  // b2b buyer CANNOT create a listing -> 403
  r = await post('/api/listings', { crop: 'X', qty: 5, price: 10 }, buyerToken)
  ok('b2b cannot create listing (403)', r.status === 403)

  // buyer places a bulk order (>= MOQ 10)
  r = await post(`/api/listings/${listingId}/buy`, { qty: 20 }, buyerToken)
  const buy = await j(r)
  ok('bulk buy ok', r.status === 200 && buy.order?.amount === 1500 * 20, JSON.stringify(buy).slice(0, 160))
  ok('stock reduced after buy', buy.listing?.qty === 60, `qty=${buy.listing?.qty}`)
  ok('gst computed 5%', buy.order?.gst === Math.round(1500 * 20 * 0.05), `gst=${buy.order?.gst}`)

  // below MOQ -> 400
  r = await post(`/api/listings/${listingId}/buy`, { qty: 3 }, buyerToken)
  ok('below MOQ rejected (400)', r.status === 400)

  // bid
  r = await post(`/api/listings/${listingId}/bid`, {}, buyerToken)
  const bid = await j(r)
  ok('bid increments count', r.status === 200 && bid.bids >= 1, `bids=${bid.bids}`)

  console.log('\n== ORDERS + NOTIFICATIONS (live sync) ==')
  // farmer should now see the order that the buyer placed
  r = await get('/api/orders', farmerToken); const forders = await j(r)
  ok('farmer sees buyer order (cross-user sync)', forders.some((o) => o.listing_id === listingId))

  // buyer sees own order
  r = await get('/api/orders', buyerToken); const borders = await j(r)
  ok('buyer sees own order', borders.length >= 1)

  // farmer got notified about the order
  r = await get('/api/notifications', farmerToken); const notifs = await j(r)
  ok('farmer got order notification', notifs.some((n) => /order place/i.test(n.text)))

  // B2C checkout broadcasts to farmers
  r = await post('/api/checkout', { items: [{ name: 'Fresh Tomatoes', price: 24, qty: 2 }] }, buyerToken)
  const co = await j(r)
  ok('b2c checkout ok', r.status === 200 && co.total === 48, JSON.stringify(co))

  console.log('\n== CLEANUP / OWNERSHIP ==')
  // buyer cannot delete farmer's listing -> 403
  r = await del(`/api/listings/${listingId}`, buyerToken)
  ok('buyer cannot delete others listing (403)', r.status === 403)
  // farmer deletes own listing
  r = await del(`/api/listings/${listingId}`, farmerToken); const dj = await j(r)
  ok('farmer deletes own listing', r.status === 200 && dj.ok === true)

  console.log(`\n==== RESULT: ${pass} passed, ${fail} failed ====`)
  process.exit(fail === 0 ? 0 : 1)
}
run().catch((e) => { console.error('TEST CRASH:', e); process.exit(2) })
