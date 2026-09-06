// test-escrow.js — full escrow lifecycle e2e (order -> escrow -> delivery -> release)
const B = 'http://localhost:4000'
let pass = 0, fail = 0
const ok = (c, m) => { c ? (pass++, console.log('  ✅', m)) : (fail++, console.log('  ❌', m)) }

async function j(path, { method = 'GET', token, body } = {}) {
  const h = { 'Content-Type': 'application/json' }
  if (token) h.Authorization = `Bearer ${token}`
  const r = await fetch(B + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined })
  return { status: r.status, data: await r.json().catch(() => null) }
}
const login = async (email) => (await j('/api/auth/login', { method: 'POST', body: { email, password: 'demo1234' } })).data.token

async function run() {
  console.log('LIFECYCLE: B2B buyer orders -> escrow -> delivery -> farmer release\n')
  const farmerTok = await login('ramesh@demo.in')
  const buyerTok = await login('buyer@demo.in')
  ok(farmerTok && buyerTok, 'farmer + buyer login')

  // farmer's escrow BEFORE
  const before = (await j('/api/escrow/summary', { token: farmerTok })).data
  console.log('  farmer escrow BEFORE:', JSON.stringify(before))

  // buyer picks a listing and orders 20 quintal
  const listings = (await j('/api/listings')).data
  const target = listings.find((l) => l.status !== 'Sold Out') || listings[0]
  ok(!!target, `picked listing #${target?.id} ${target?.crop} @₹${target?.price}`)
  const buy = await j(`/api/listings/${target.id}/buy`, { method: 'POST', token: buyerTok, body: { qty: 20 } })
  ok(buy.status === 200 && buy.data.order, `order placed (status ${buy.status}), order #${buy.data.order?.id}, escrow status="${buy.data.order?.status}"`)
  const orderId = buy.data.order.id
  const expectedTotal = buy.data.order.amount + buy.data.order.gst

  // farmer escrow AFTER order -> locked should rise by total
  const afterOrder = (await j('/api/escrow/summary', { token: farmerTok })).data
  console.log('  farmer escrow AFTER order:', JSON.stringify(afterOrder))
  ok(afterOrder.locked >= before.locked + expectedTotal - 1, `locked rose by ₹${expectedTotal} (in escrow)`)

  // order shows in farmer's order list with buyer name
  const fOrders = (await j('/api/orders', { token: farmerTok })).data
  const fo = fOrders.find((o) => o.id === orderId)
  ok(fo && fo.buyer_name, `farmer sees order #${orderId} from buyer "${fo?.buyer_name}"`)

  // buyer confirms delivery
  const deliv = await j(`/api/orders/${orderId}/status`, { method: 'POST', token: buyerTok, body: { status: 'Delivered' } })
  ok(deliv.status === 200 && deliv.data.status === 'Delivered', 'buyer confirmed delivery')
  const afterDeliv = (await j('/api/escrow/summary', { token: farmerTok })).data
  ok(afterDeliv.pending >= expectedTotal - 1, `after delivery -> pending release ₹${afterDeliv.pending}`)

  // farmer releases payment
  const rel = await j(`/api/orders/${orderId}/status`, { method: 'POST', token: farmerTok, body: { status: 'Farmer Credited' } })
  ok(rel.status === 200 && rel.data.status === 'Farmer Credited', 'farmer released payment')
  const afterRel = (await j('/api/escrow/summary', { token: farmerTok })).data
  console.log('  farmer escrow AFTER release:', JSON.stringify(afterRel))
  ok(afterRel.credited >= expectedTotal - 1, `credited rose to ₹${afterRel.credited}`)

  // permission: buyer canNOT release payment
  const badRel = await j(`/api/orders/${orderId}/status`, { method: 'POST', token: buyerTok, body: { status: 'Farmer Credited' } })
  ok(badRel.status === 403, 'buyer blocked from releasing payment (403)')

  // order detail for invoice (buyer can fetch own)
  const det = await j(`/api/orders/${orderId}`, { token: buyerTok })
  ok(det.status === 200 && det.data.crop && det.data.buyer_name, 'order detail for invoice (crop + buyer + email)')

  // stranger cannot see this order
  const anitaTok = await login('anita@demo.in')
  const steal = await j(`/api/orders/${orderId}`, { token: anitaTok })
  ok(steal.status === 403, 'unrelated user blocked from order detail (403)')

  console.log(`\n=== ${pass} passed, ${fail} failed ===`)
  process.exit(fail ? 1 : 0)
}
run().catch((e) => { console.error('CRASH', e); process.exit(1) })
