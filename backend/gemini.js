// gemini.js — Gemini vision grading with multi-key rotation + auto-failover
import dotenv from 'dotenv'
dotenv.config()

const KEYS = (process.env.GEMINI_KEYS || '').split(',').map((k) => k.trim()).filter(Boolean)
const MODELS = (process.env.GEMINI_MODELS || 'gemini-flash-latest,gemini-flash-lite-latest')
  .split(',').map((m) => m.trim()).filter(Boolean)

let cursor = 0 // round-robin pointer across keys

export const hasKeys = () => KEYS.length > 0

// crop-name hints so the model has context (farmer may type Hindi)
function cropHint(cropName = '') {
  const c = cropName.toLowerCase()
  if (/tamatar|tomato|टमाटर/.test(c)) return 'Tomato'
  if (/aloo|potato|आलू/.test(c)) return 'Potato'
  if (/pyaz|onion|प्याज/.test(c)) return 'Onion'
  if (/gehun|wheat|गेहूं/.test(c)) return 'Wheat'
  if (/mirch|chilli|मिर्च/.test(c)) return 'Chilli'
  return cropName || 'crop'
}

function buildPrompt(cropName) {
  return `You are an agricultural produce quality inspector for an Indian farm-to-market platform.
The farmer says this crop is: "${cropName || 'unknown'}" (hint: ${cropHint(cropName)}).
Look at the photo and assess quality. Reply with ONLY a compact JSON object, no markdown, no extra text:
{"crop":"<detected crop>","grade":"A|B|C","moisture":"<e.g. 12%>","confidence":"<e.g. 90%>","note":"<max 12 words on color/damage/freshness>"}
Grade A = fresh, uniform, no visible damage. Grade B = minor blemishes. Grade C = significant damage/spoilage.`
}

function parseModelJson(text) {
  if (!text) return null
  // strip ```json fences if present
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    // try to find first {...} block
    const m = cleaned.match(/\{[\s\S]*\}/)
    if (m) { try { return JSON.parse(m[0]) } catch { return null } }
    return null
  }
}

/**
 * Grade a crop image. Rotates through keys; on 429/404/5xx tries next key+model.
 * @param {string} base64  raw base64 (no data: prefix)
 * @param {string} mimeType e.g. image/jpeg
 * @param {string} cropName farmer-provided crop name (optional context)
 * @returns {Promise<{ok:boolean, grade?:object, error?:string, keyIndex?:number, model?:string}>}
 */
export async function gradeImage(base64, mimeType = 'image/jpeg', cropName = '') {
  if (KEYS.length === 0) return { ok: false, error: 'No Gemini keys configured' }

  const body = JSON.stringify({
    contents: [{
      parts: [
        { text: buildPrompt(cropName) },
        { inline_data: { mime_type: mimeType, data: base64 } },
      ],
    }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 200 },
  })

  const attempts = KEYS.length * MODELS.length
  let lastErr = 'unknown'

  for (let a = 0; a < attempts; a++) {
    const keyIndex = (cursor + a) % KEYS.length
    const model = MODELS[Math.floor(a / KEYS.length) % MODELS.length]
    const key = KEYS[keyIndex]
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(30000),
      })

      if (res.status === 429 || res.status === 404 || res.status >= 500) {
        lastErr = `key${keyIndex + 1}/${model} -> HTTP ${res.status}`
        continue // rotate to next key/model
      }

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        lastErr = `key${keyIndex + 1} -> ${data?.error?.message || res.status}`
        continue
      }

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
      const parsed = parseModelJson(text)
      if (parsed && parsed.grade) {
        // advance cursor so next request starts on the following key (spreads load)
        cursor = (keyIndex + 1) % KEYS.length
        return {
          ok: true,
          keyIndex: keyIndex + 1,
          model,
          grade: {
            crop: parsed.crop || cropName || 'Unknown',
            grade: String(parsed.grade).toUpperCase().slice(0, 1),
            moisture: parsed.moisture || '—',
            confidence: parsed.confidence || '90%',
            note: parsed.note || '',
          },
        }
      }
      lastErr = `key${keyIndex + 1} -> unparseable response`
    } catch (e) {
      lastErr = `key${keyIndex + 1} -> ${e.name === 'TimeoutError' ? 'timeout' : e.message}`
    }
  }

  return { ok: false, error: `All keys failed. Last: ${lastErr}` }
}
