// LanguageSwitcher — 4-language dropdown (English base + Hinglish + Hindi + Marathi).
// Offline, instant, glitch-free. Used inside Navbar so it appears on every page.
import { useState, useRef, useEffect } from 'react'
import { Globe, Check, ChevronDown } from 'lucide-react'
import { useLang, LANGS } from '../i18n/index.jsx'

export default function LanguageSwitcher({ dark = true }) {
  const { lang, setLang } = useLang()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const active = LANGS.find((l) => l.code === lang) || LANGS[0]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition
          ${dark ? 'bg-white/10 border border-white/15 text-white hover:bg-white/20'
                 : 'bg-black/5 border border-black/10 text-[#16240a] hover:bg-black/10'}`}
        aria-label="Change language"
      >
        <Globe size={14} />
        <span>{active.native}</span>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-black/5 p-2 text-[#16240a] z-[1300]">
          <p className="text-[11px] font-semibold text-black/40 px-3 py-1.5">भाषा / Language</p>
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false) }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm hover:bg-emerald-50 transition
                ${l.code === lang ? 'text-emerald-700 font-semibold bg-emerald-50/60' : 'text-black/70'}`}
            >
              <span>{l.native}{l.label !== l.native && <span className="text-black/35 text-xs ml-1.5">{l.label}</span>}</span>
              {l.code === lang && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
