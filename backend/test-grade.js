// test-grade.js — end-to-end AI grading test through the real API
import { readFileSync } from 'fs'
const B = 'http://localhost:4000'

const run = async () => {
  // login
  let r = await fetch(B + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ramesh@demo.in', password: 'demo1234' }),
  })
  const { token } = await r.json()
  console.log('login:', token ? 'OK' : 'FAILED')

  // load the tomato test image, base64
  const b64 = readFileSync('/tmp/tj.jpg').toString('base64')
  console.log('image bytes:', Buffer.from(b64, 'base64').length)

  // call grading endpoint (what the FarmerDashboard photo upload will do)
  const t0 = Date.now()
  r = await fetch(B + '/api/grade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ image: b64, mimeType: 'image/jpeg', crop: 'Tamatar' }),
  })
  const data = await r.json()
  const ms = Date.now() - t0
  console.log(`\nHTTP ${r.status} in ${ms}ms`)
  console.log('GRADE RESULT:', JSON.stringify(data, null, 2))

  // auth guard: no token -> 401
  r = await fetch(B + '/api/grade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: b64 }) })
  console.log('\nno-token grade ->', r.status, '(expect 401)')

  // missing image -> 400
  r = await fetch(B + '/api/grade', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ crop: 'x' }) })
  console.log('no-image grade ->', r.status, '(expect 400)')
}
run().catch((e) => { console.error('CRASH', e); process.exit(1) })
