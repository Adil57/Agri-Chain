// gen-i18n.mjs — auto-generate Hindi + Marathi dicts from English keys via MyMemory (free, no key).
// Usage: node scripts/gen-i18n.mjs
// Reads English keys from src/i18n/keys.json, translates each to hi + mr, writes dicts/hi.js + mr.js.
// Placeholders like {grade} are protected from translation. Caches results to .trans-cache.json.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dir, '..')
const KEYS_FILE = join(ROOT, 'src/i18n/keys.json')
const CACHE_FILE = join(ROOT, 'src/i18n/.trans-cache.json')
const DICTS = join(ROOT, 'src/i18n/dicts')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Protect {placeholders} by swapping to sentinels the engine won't translate, then restore.
function protect(text) {
  const tokens = []
  const masked = text.replace(/\{[^}]+\}/g, (m) => {
    tokens.push(m)
    return `[[${tokens.length - 1}]]`
  })
  return { masked, tokens }
}
function restore(text, tokens) {
  let out = text
  tokens.forEach((tok, i) => {
    // MyMemory sometimes adds spaces inside brackets; be lenient
    const re = new RegExp(`\\[\\[\\s*${i}\\s*\\]\\]`, 'g')
    out = out.replace(re, tok)
  })
  return out
}

async function translate(text, target) {
  const { masked, tokens } = protect(text)
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(masked)}&langpair=en|${target}`
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(15000) })
      const d = await r.json()
      const out = d?.responseData?.translatedText
      if (out) return restore(out, tokens)
    } catch { /* retry */ }
    await sleep(1500)
  }
  return null
}

async function main() {
  const keys = JSON.parse(readFileSync(KEYS_FILE, 'utf8'))
  const cache = existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, 'utf8')) : {}
  const result = { hi: {}, mr: {} }
  let failed = 0

  for (const lang of ['hi', 'mr']) {
    console.log(`\n=== ${lang} (${keys.length} keys) ===`)
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      const ck = `${lang}::${key}`
      if (cache[ck]) { result[lang][key] = cache[ck]; continue }
      const tr = await translate(key, lang)
      if (tr && tr.trim()) { result[lang][key] = tr; cache[ck] = tr }
      else { failed++; console.log(`  WARN failed: "${key}"`) }
      if ((i + 1) % 20 === 0) process.stdout.write(`  ${i + 1}/${keys.length}\n`)
      await sleep(600) // polite to the free API
    }
  }

  if (!existsSync(DICTS)) mkdirSync(DICTS, { recursive: true })
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2))

  for (const lang of ['hi', 'mr']) {
    const body = `// AUTO-GENERATED from English base via scripts/gen-i18n.mjs (MyMemory). Do not edit by hand.\nexport default ${JSON.stringify(result[lang], null, 2)}\n`
    writeFileSync(join(DICTS, `${lang}.js`), body)
    console.log(`wrote dicts/${lang}.js (${Object.keys(result[lang]).length}/${keys.length} entries)`)
  }
  console.log(`\nDONE. total failures: ${failed}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
