import { createClient } from '@supabase/supabase-js'
import ws from 'ws'
import dotenv from 'dotenv'
dotenv.config()

// Node 20 has no native WebSocket global — provide one so @supabase/realtime-js works.
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = ws
}

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY

if (!url || !serviceKey) {
  console.warn('[supabase] SUPABASE_URL / SUPABASE_SERVICE_KEY not set — storage & admin DB features disabled')
}

// Service-role client (backend-only, bypasses RLS). NEVER expose to frontend.
export const supabase = url && serviceKey
  ? createClient(url, serviceKey, {
      auth: { persistSession: false },
      realtime: { enabled: false },
    })
  : null

export const BUCKET = 'auth-docs'

// Ensure the storage bucket exists (idempotent)
export async function ensureBucket() {
  if (!supabase) return false
  const { data: buckets } = await supabase.storage.listBuckets()
  if (buckets?.some((b) => b.name === BUCKET)) return true
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: false,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'],
    fileSizeLimit: 5 * 1024 * 1024,
  })
  return !error
}
