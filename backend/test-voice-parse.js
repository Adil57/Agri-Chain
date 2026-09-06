// test-voice-parse.js — CURRENT parser logic, tested against realistic hi-IN transcripts
function parseCurrent(text) {
  const lower = text.toLowerCase()
  const cropMap = [
    ['Tamatar', ['tamatar', 'tomato']],
    ['Aloo', ['aloo', 'aalu', 'potato']],
    ['Pyaz', ['pyaz', 'pyaaz', 'onion']],
    ['Gehun', ['gehun', 'gehu', 'wheat']],
  ]
  let crop = ''
  for (const [name, keys] of cropMap) if (keys.some((k) => lower.includes(k))) { crop = name; break }
  let price = ''
  const pm = lower.match(/(?:₹|rs\.?|rupaye|rupees|rupee|price|daam|bhav)\s*([\d,]{2,7})/) || lower.match(/([\d,]{3,7})\s*(?:rupaye|rupees|rupee|rs|₹)/)
  if (pm) price = pm[1].replace(/,/g, '')
  let qty = '', unit = ''
  const qm = lower.match(/(\d{1,6})\s*(quintal|kwintal|kg|kilo|ton|tonne)?/)
  if (qm && (!price || qm[1] !== price)) { qty = qm[1]; if (qm[2]) unit = /kg|kilo/.test(qm[2]) ? 'Kg' : 'Quintal' }
  return { crop, qty, unit, price }
}

// Realistic transcripts Chrome hi-IN can return
const samples = [
  'Tamatar 50 quintal 1800 rupaye',      // pure roman + digits (best case)
  'tamatar pachaas quintal',             // roman + hindi number word
  'टमाटर 50 क्विंटल',                     // devanagari crop + ascii digit
  'टमाटर पचास क्विंटल अठारह सौ रुपये',    // full devanagari + hindi words
  'आलू 120 किलो',                         // devanagari aloo + kg
  'gehun do sau quintal',                // roman + "do sau" = 200
  'प्याज ५० क्विंटल',                      // devanagari digits ५०
]

console.log('=== CURRENT parser (what user is hitting) ===\n')
for (const s of samples) {
  const r = parseCurrent(s)
  const filled = [r.crop, r.qty && `${r.qty}${r.unit ? ' ' + r.unit : ''}`, r.price && `₹${r.price}`].filter(Boolean).join(' · ')
  console.log(`  "${s}"`)
  console.log(`     -> ${filled || '❌ KUCH NAHI BHARA'}\n`)
}
