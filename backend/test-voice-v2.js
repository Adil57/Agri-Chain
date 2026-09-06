// test-voice-v2.js — NEW robust parser (Devanagari + Hindi number words)
function buildParser() {
  const CROPS = [
    ['Tamatar', ['tamatar', 'tomato', 'टमाटर', 'टमाटो']],
    ['Aloo', ['aloo', 'aalu', 'potato', 'आलू', 'आलु']],
    ['Pyaz', ['pyaz', 'pyaaz', 'onion', 'प्याज', 'प्याज़']],
    ['Gehun', ['gehun', 'gehu', 'wheat', 'गेहूं', 'गेहूँ', 'गेहु']],
    ['Chawal', ['chawal', 'rice', 'dhan', 'चावल', 'धान']],
    ['Mirch', ['mirch', 'chilli', 'chili', 'मिर्च', 'मिरची']],
    ['Bhindi', ['bhindi', 'okra', 'भिंडी', 'भिन्डी']],
    ['Gobi', ['gobi', 'gobhi', 'cauliflower', 'cabbage', 'गोभी', 'गोबी']],
  ]
  const UNITS = [
    ['Kg', ['kg', 'kilo', 'kilogram', 'किलो', 'केजी']],
    ['Quintal', ['quintal', 'kwintal', 'क्विंटल', 'कुंतल', 'क्वि़ंटल']],
  ]
  // Hindi/roman number words
  const NUM = {
    'zero': 0, 'shunya': 0, 'शून्य': 0,
    'ek': 1, 'एक': 1, 'do': 2, 'दो': 2, 'teen': 3, 'तीन': 3, 'char': 4, 'chaar': 4, 'चार': 4,
    'panch': 5, 'paanch': 5, 'पांच': 5, 'पाँच': 5, 'chah': 6, 'chhah': 6, 'chhe': 6, 'छह': 6, 'छे': 6,
    'saat': 7, 'सात': 7, 'aath': 8, 'आठ': 8, 'nau': 9, 'नौ': 9, 'das': 10, 'दस': 10,
    'gyarah': 11, 'ग्यारह': 11, 'barah': 12, 'बारह': 12,
    'satrah': 17, 'सत्रह': 17, 'atharah': 18, 'athaarah': 18, 'अठारह': 18,
    'bees': 20, 'बीस': 20, 'tees': 30, 'तीस': 30,
    'chalis': 40, 'chaalis': 40, 'चालीस': 40, 'pachas': 50, 'pachaas': 50, 'पचास': 50,
    'saath': 60, 'साठ': 60, 'sattar': 70, 'सत्तर': 70, 'assi': 80, 'अस्सी': 80, 'nabbe': 90, 'नब्बे': 90,
  }
  const MULT = { 'sau': 100, 'सौ': 100, 'hazar': 1000, 'hajar': 1000, 'hazaar': 1000, 'हजार': 1000, 'हज़ार': 1000, 'lakh': 100000, 'लाख': 100000 }

  const devToAscii = (s) => s.replace(/[०-९]/g, (d) => '०१२३४५६७८९'.indexOf(d))

  // parse a sequence of number-words like "do sau" -> 200, "athaarah sau" -> 1800
  function wordsToNumber(tokens) {
    let total = 0, current = 0, found = false
    for (const t of tokens) {
      if (t in NUM) { current += NUM[t]; found = true }
      else if (t in MULT) { current = (current || 1) * MULT[t]; total += current; current = 0; found = true }
      else { if (current) { total += current; current = 0 } }
    }
    total += current
    return found ? total : null
  }

  return function parse(text) {
    const raw = devToAscii(text)
    const lower = raw.toLowerCase()
    const tokens = lower.replace(/[.,₹]/g, ' ').split(/\s+/).filter(Boolean)

    // crop
    let crop = ''
    for (const [name, keys] of CROPS) if (keys.some((k) => lower.includes(k.toLowerCase()))) { crop = name; break }

    // unit + its token index
    let unit = ''
    let unitIdx = -1
    for (const [name, keys] of UNITS) {
      const i = tokens.findIndex((t) => keys.some((k) => t.includes(k.toLowerCase())))
      if (i !== -1) { unit = name; unitIdx = i; break }
    }

    // price cue token index (rupaye/₹/daam...)
    const priceCue = ['rupaye', 'rupees', 'rupee', 'rs', 'price', 'daam', 'bhav', 'रुपये', 'रुपए', 'रुपया']
    const priceIdx = tokens.findIndex((t) => priceCue.some((c) => t.includes(c)))

    // ---- QTY: prefer number(s) BEFORE the unit; else before price cue; else first ----
    const sliceForQty = unitIdx !== -1 ? tokens.slice(0, unitIdx)
      : priceIdx !== -1 ? tokens.slice(0, priceIdx) : tokens
    let qty = ''
    const qDigit = sliceForQty.find((t) => /^\d{1,7}$/.test(t))
    if (qDigit) qty = qDigit
    else { const n = wordsToNumber(sliceForQty); if (n) qty = String(n) }

    // ---- PRICE: number(s) AFTER unit, or right before/after the price cue ----
    let price = ''
    // explicit "1800 rupaye" or "rupaye 1800" digits
    const pm = lower.match(/([\d,]{2,7})\s*(?:rupaye|rupees|rupee|rs|₹|रुपये|रुपए)/)
      || lower.match(/(?:₹|rs\.?|rupaye|rupees|price|daam|bhav|रुपये|रुपए)\s*([\d,]{2,7})/)
    if (pm) price = pm[1].replace(/,/g, '')
    if (!price) {
      // words after the unit (e.g. "athaarah sau rupaye") — everything past unitIdx
      const start = unitIdx !== -1 ? unitIdx + 1 : (qDigit ? tokens.indexOf(qDigit) + 1 : 0)
      const rest = tokens.slice(start)
      // digit in the rest that isn't qty
      const pDigit = rest.find((t) => /^\d{2,7}$/.test(t) && t !== qty)
      if (pDigit) price = pDigit
      else { const n = wordsToNumber(rest); if (n && String(n) !== qty) price = String(n) }
    }

    return { crop, qty, unit, price }
  }
}

const parse = buildParser()
const samples = [
  'Tamatar 50 quintal 1800 rupaye',
  'tamatar pachaas quintal',
  'टमाटर 50 क्विंटल',
  'टमाटर पचास क्विंटल अठारह सौ रुपये',
  'आलू 120 किलो',
  'gehun do sau quintal',
  'प्याज ५० क्विंटल',
  'mirch 20 kg 4000 rupaye',
]
console.log('=== NEW parser v2 ===\n')
for (const s of samples) {
  const r = parse(s)
  const filled = [r.crop, r.qty && `${r.qty}${r.unit ? ' ' + r.unit : ''}`, r.price && `₹${r.price}`].filter(Boolean).join(' · ')
  console.log(`  "${s}"\n     -> ${filled || '❌ nothing'}\n`)
}
