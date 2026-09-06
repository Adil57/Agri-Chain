// i18n engine — lightweight, offline, glitch-free (no Google runtime dependency).
// English is the BASE language: t('Some English text') returns the English text as-is
// unless a translation exists for the active language. hi/mr/hinglish dicts map
// English -> target string. Auto-generated dicts live in ./dicts.
import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import en from './dicts/en'          // identity / canonical English keys (optional overrides)
import hinglish from './dicts/hinglish'
import hi from './dicts/hi'
import mr from './dicts/mr'

export const LANGS = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hinglish', label: 'Hinglish', native: 'Hinglish' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
]

const DICTS = { en, hinglish, hi, mr }
const STORAGE_KEY = 'krishisetu-lang'

const LangContext = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    if (typeof window === 'undefined') return 'en'
    return localStorage.getItem(STORAGE_KEY) || 'en'
  })

  const setLang = useCallback((code) => {
    setLangState(code)
    try { localStorage.setItem(STORAGE_KEY, code) } catch { /* ignore */ }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = code === 'hinglish' ? 'en' : code
    }
  }, [])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang === 'hinglish' ? 'en' : lang
    }
  }, [lang])

  // t(englishText, vars?) — English is the fallback so untranslated strings still render.
  const t = useCallback((text, vars) => {
    const dict = DICTS[lang] || {}
    let out = dict[text] != null ? dict[text] : text
    if (vars) {
      for (const k of Object.keys(vars)) {
        out = out.replaceAll(`{${k}}`, String(vars[k]))
      }
    }
    return out
  }, [lang])

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) return { lang: 'en', setLang: () => {}, t: (s) => s }
  return ctx
}

// convenience hook when you only need t()
export function useT() {
  return useLang().t
}
