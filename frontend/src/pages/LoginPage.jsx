import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sprout, Store, ShoppingBasket, ArrowRight, User, Mail, Lock, Building2, MapPin } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useT } from '../i18n/index.jsx'

export default function LoginPage() {
  const navigate = useNavigate()
  const t = useT()
  const { login, register, loading } = useAuthStore()

  const roles = [
    { id: 'farmer', label: t('Farmer / FPO'), path: '/farmer', icon: Sprout, desc: t('List crops, connect with buyers') },
    { id: 'b2b', label: t('B2B Buyer'), path: '/b2b', icon: Store, desc: t('Mills, Wholesalers, Bulk Traders') },
    { id: 'b2c', label: t('B2C Buyer'), path: '/b2c', icon: ShoppingBasket, desc: t('Buy fresh produce directly') },
  ]
  const roleHome = { farmer: '/farmer', b2b: '/b2b', b2c: '/b2c' }

  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [name, setName] = useState('')
  const [org, setOrg] = useState('')
  const [city, setCity] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [repName, setRepName] = useState('')
  const [gst, setGst] = useState('')
  const [bankIfsc, setBankIfsc] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [authDoc, setAuthDoc] = useState('')
  const [selectedRole, setSelectedRole] = useState(null)
  const [error, setError] = useState('')

  const submit = async () => {
    setError('')
    try {
      if (mode === 'login') {
        if (!email.trim() || !password) return setError(t('Please enter email and password'))
        const user = await login(email.trim(), password)
        navigate(roleHome[user.role] || '/')
      } else {
        if (!name.trim()) return setError(t('Name is required'))
        if (!email.trim() || !password) return setError(t('Email and password are required'))
        if (password.length < 6) return setError(t('Password must be at least 6 characters'))
        if (!selectedRole) return setError(t('Please select a role'))
        const user = await register({
          name: name.trim(), email: email.trim(), password,
          role: selectedRole.id, org: org.trim() || undefined,
          city: city.trim() || undefined,
          business_name: businessName.trim() || undefined,
          rep_name: repName.trim() || undefined,
          gst: gst.trim() || undefined,
          bank_ifsc: bankIfsc.trim() || undefined,
          bank_account: bankAccount.trim() || undefined,
          auth_doc_url: authDoc.trim() || undefined,
        })
        navigate(roleHome[user.role] || '/')
      }
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b3d2e] via-[#0f5132] to-[#198754] flex items-center justify-center px-4 py-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden grid md:grid-cols-2"
          >
            {/* LEFT HERO (Flipkart-ish brand panel) */}
            <div className="hidden md:flex flex-col justify-between bg-[#f7faf5] p-8 border-r border-black/5">
              <div>
                <h1 className="text-3xl font-extrabold text-[#16240a]">
                  Agri<span className="text-amber-500">Chain</span>
                </h1>
                <p className="text-sm text-black/45 mt-1">Farm to Fork, Direct.</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">🌾</div>
                  <p className="text-sm text-black/60">List crops with AI quality grading</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">🚚</div>
                  <p className="text-sm text-black/60">Live shipment tracking to your door</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">💳</div>
                  <p className="text-sm text-black/60">Secure escrow payments</p>
                </div>
              </div>
              <p className="text-xs text-black/30">© AgriChain — KrishiSetu Platform</p>
            </div>

            {/* RIGHT FORM */}
            <div className="p-7 md:p-8">
              <div className="md:hidden text-center mb-6">
                <h1 className="text-2xl font-extrabold text-[#16240a]">Agri<span className="text-amber-500">Chain</span></h1>
              </div>

              {/* mode toggle */}
              <div className="flex bg-black/5 rounded-full p-1 mb-6">
                {['login', 'register'].map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setError('') }}
                    className={`flex-1 py-2 rounded-full text-sm font-semibold transition ${mode === m ? 'bg-white shadow text-[#16240a]' : 'text-black/45'}`}
                  >
                    {m === 'login' ? t('Login') : t('Register')}
                  </button>
                ))}
              </div>

              {mode === 'register' && (
                <>
                  <Field icon={User} label={t('Your Name')}>
                    <input value={name} onChange={(e) => { setName(e.target.value); setError('') }}
                      placeholder={t('e.g. Ramesh Kumar')} className={inp} />
                  </Field>
                  {selectedRole?.id === 'b2b' ? (
                    <>
                      <Field icon={Building2} label={t('Business Name')}>
                        <input value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                          placeholder={t('e.g. Sharma Agro Mills Pvt Ltd')} className={inp} />
                      </Field>
                      <Field icon={User} label={t('Representative Name')}>
                        <input value={repName} onChange={(e) => setRepName(e.target.value)}
                          placeholder={t('e.g. Amit Sharma')} className={inp} />
                      </Field>
                      <Field icon={Building2} label={t('GST / Invoice No. (Optional)')}>
                        <input value={gst} onChange={(e) => setGst(e.target.value)}
                          placeholder={t('e.g. 27AABCU9603R1Z')} className={inp} />
                      </Field>
                      <Field icon={Building2} label={t('Bank IFSC')}>
                        <input value={bankIfsc} onChange={(e) => setBankIfsc(e.target.value)}
                          placeholder={t('e.g. SBIN0001234')} className={inp} />
                      </Field>
                      <Field icon={Building2} label={t('Bank Account No.')}>
                        <input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)}
                          placeholder={t('e.g. 123456789012')} className={inp} />
                      </Field>
                      <Field icon={Building2} label={t('Auth Document URL (Optional)')}>
                        <input value={authDoc} onChange={(e) => setAuthDoc(e.target.value)}
                          placeholder={t('e.g. https://supabase.co/storage/.../doc.pdf')} className={inp} />
                      </Field>
                    </>
                  ) : (
                    <Field icon={Building2} label={t('Organisation (optional)')}>
                      <input value={org} onChange={(e) => setOrg(e.target.value)}
                        placeholder={t('e.g. Nashik FPO')} className={inp} />
                    </Field>
                  )}
                  <Field icon={MapPin} label={selectedRole?.id === 'farmer' ? t('Farm Location (city/town)') : t('Delivery City')}>
                    <input value={city} onChange={(e) => { setCity(e.target.value); setError('') }}
                      placeholder={t('e.g. Lasalgaon, Nashik')} className={inp} />
                  </Field>
                </>
              )}

              <Field icon={Mail} label={t('Email')}>
                <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }}
                  placeholder="you@example.com" className={inp} />
              </Field>

              <Field icon={Lock} label={t('Password')}>
                <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError('') }}
                  placeholder="••••••••" className={inp}
                  onKeyDown={(e) => e.key === 'Enter' && mode === 'login' && submit()} />
              </Field>

              {mode === 'register' && (
                <div className="mb-5">
                  <p className="text-sm font-semibold text-[#16240a] mb-2.5">{t('Who are you?')}</p>
                  <div className="space-y-2.5">
                    {roles.map((r) => (
                      <button key={r.id} onClick={() => { setSelectedRole(r); setError('') }}
                        className={`w-full flex items-center gap-3.5 p-3 rounded-2xl border-2 transition text-left ${selectedRole?.id === r.id ? 'border-amber-400 bg-amber-50' : 'border-black/10 hover:border-black/20'}`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${selectedRole?.id === r.id ? 'bg-amber-500 text-white' : 'bg-black/5 text-black/50'}`}>
                          <r.icon size={17} />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-[#16240a]">{r.label}</p>
                          <p className="text-xs text-black/45">{r.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}

              <button onClick={submit} disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#16240a] hover:bg-[#213610] disabled:opacity-60 text-white font-bold py-3.5 rounded-full transition">
                {loading ? t('Please wait...') : mode === 'login' ? t('Login') : t('Create Account')} <ArrowRight size={16} />
              </button>

              {mode === 'login' && (
                <p className="text-center text-xs text-black/40 mt-4">
                  {t('Demo')}: <span className="font-semibold">ramesh@demo.in</span> / <span className="font-semibold">demo1234</span>
                </p>
              )}

              <button onClick={() => navigate('/')} className="w-full text-center text-xs text-black/40 mt-3 hover:text-black/60">
                {t('Back to home page')}
              </button>
            </div>
          </motion.div>
        </div>
  )
}

const inp = 'w-full border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50'

function Field({ icon: Icon, label, children }) {
  return (
    <div className="mb-4">
      <label className="text-sm font-semibold text-[#16240a] mb-2 flex items-center gap-1.5">
        <Icon size={14} /> {label}
      </label>
      {children}
    </div>
  )
}
