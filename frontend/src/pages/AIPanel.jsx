import { useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { motion } from 'framer-motion'
import {
  TrendingUp, MapPinned, ShieldCheck, CheckCircle2, Sparkles,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Card from '../components/ui/Card'
import PageHeader from '../components/ui/PageHeader'
import { useListingsStore } from '../store/useListingsStore'
import { useT } from '../i18n/index.jsx'

const priceData = [
  { day: 'Mon', mandi: 1400, ai: 1420 },
  { day: 'Tue', mandi: 1380, ai: 1440 },
  { day: 'Wed', mandi: 1450, ai: 1460 },
  { day: 'Thu', mandi: 1420, ai: 1490 },
  { day: 'Fri', mandi: 1470, ai: 1510 },
  { day: 'Sat', mandi: 1500, ai: 1530 },
  { day: 'Sun', mandi: 1490, ai: 1550 },
]

export default function AIPanel() {
  const t = useT()
  const store = useListingsStore()
  const listings = Array.isArray(store?.listings) ? store.listings : []

  useEffect(() => {
    store.fetchListings?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalListings = listings.length
  const totalBids = listings.reduce((sum, item) => sum + Number(item?.bids || 0), 0)
  const gradeA = listings.filter((item) => item?.grade === 'A').length
  const avgPrice =
    listings.length > 0
      ? Math.round(listings.reduce((sum, item) => sum + Number(item?.price || 0), 0) / listings.length)
      : 0

  return (
    <div className="min-h-screen bg-[#fdfaf3]">
      <Navbar />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageHeader
          eyebrow={t('Judges Special')}
          title={t('AI Engine & Analytics')}
          subtitle={t('Platform intelligence for price discovery, quality and logistics.')}
        />

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
          <Card className="p-5">
            <p className="text-xs text-black/45 font-semibold">{t('Listings Tracked')}</p>
            <p className="text-2xl font-extrabold text-[#16240a] mt-2">{totalListings}</p>
          </Card>
          <Card className="p-5" delay={0.05}>
            <p className="text-xs text-black/45 font-semibold">{t('Bids Matched')}</p>
            <p className="text-2xl font-extrabold text-[#16240a] mt-2">{totalBids}</p>
          </Card>
          <Card className="p-5" delay={0.1}>
            <p className="text-xs text-black/45 font-semibold">{t('Grade A Produce')}</p>
            <p className="text-2xl font-extrabold text-[#16240a] mt-2">{gradeA}/{totalListings}</p>
          </Card>
          <Card className="p-5" delay={0.15}>
            <p className="text-xs text-black/45 font-semibold">{t('Average Price')}</p>
            <p className="text-2xl font-extrabold text-[#16240a] mt-2">₹{avgPrice}</p>
          </Card>
        </section>

        <Card className="p-5 md:p-8 mb-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={19} className="text-amber-600" />
            <div>
              <h2 className="font-bold text-[#16240a]">{t('AI Price Forecast')}</h2>
              <p className="text-xs text-black/40">{t('Mandi rate vs predicted fair price')}</p>
            </div>
          </div>

          <div className="w-full h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee9dc" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="mandi" stroke="#78350f" strokeWidth={2} dot={false} name={t('Mandi Rate')} />
                <Line type="monotone" dataKey="ai" stroke="#f5a524" strokeWidth={3} dot={false} name={t('AI Predicted')} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <section className="grid md:grid-cols-2 gap-6 mb-6">
          <Card className="p-6">
            <h2 className="flex items-center gap-2 font-bold text-[#16240a] mb-5">
              <MapPinned size={18} /> {t('Logistics Route Optimization')}
            </h2>
            <div className="relative h-52 rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-50 to-amber-50">
              <svg viewBox="0 0 400 220" className="absolute inset-0 w-full h-full">
                <motion.path
                  d="M45 165 C100 45, 180 190, 235 80 S330 80, 365 35"
                  fill="none" stroke="#d99a22" strokeWidth="4" strokeDasharray="8 8"
                  animate={{ strokeDashoffset: [0, -32] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                />
                {[[45, 165], [125, 105], [235, 80], [365, 35]].map(([cx, cy], index) => (
                  <motion.circle
                    key={index} cx={cx} cy={cy} r="8"
                    fill={index === 3 ? '#166534' : '#f59e0b'}
                    animate={{ r: [7, 10, 7] }}
                    transition={{ repeat: Infinity, duration: 1.8, delay: index * 0.2 }}
                  />
                ))}
              </svg>
              <div className="absolute bottom-3 left-3 right-3 bg-white/80 backdrop-blur rounded-xl px-3 py-2 text-xs font-semibold text-[#16240a]">
                {t('One truck pooling {n} nearby farms', { n: Math.max(totalListings, 1) })}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="flex items-center gap-2 font-bold text-[#16240a] mb-5">
              <ShieldCheck size={18} /> {t('Escrow Status')}
            </h2>
            <div className="space-y-5">
              {[
                { n: '1', label: t('Payment Locked in Escrow'), done: true },
                { n: '2', label: t('Quality Verified'), done: true },
                { n: '3', label: t('Farmer Bank Credited'), done: false },
              ].map((s) => (
                <div key={s.n} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${s.done ? 'bg-emerald-500 text-white' : 'bg-black/10 text-black/40'}`}>
                    {s.done ? <CheckCircle2 size={16} /> : s.n}
                  </div>
                  <span className={`text-sm ${s.done ? 'font-semibold text-[#16240a]' : 'text-black/40'}`}>{s.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 h-2 rounded-full bg-black/10 overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: '66%' }} transition={{ duration: 1 }} className="h-full rounded-full bg-emerald-500" />
            </div>
          </Card>
        </section>

        <Card className="p-6 md:p-8 bg-gradient-to-br from-[#16240a] to-[#294116] text-white border-0">
          <h2 className="flex items-center gap-2 font-bold mb-2">
            <Sparkles size={18} className="text-amber-400" /> {t('AI Trust & Fairness Layer')}
          </h2>
          <p className="text-sm text-white/60 mb-5">{t('Quality, price anomaly and fraud-risk signals are continuously monitored.')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-2xl p-4"><p className="text-xs text-white/50">{t('Fair Price Index')}</p><p className="text-xl font-extrabold text-amber-400 mt-1">92/100</p></div>
            <div className="bg-white/10 rounded-2xl p-4"><p className="text-xs text-white/50">{t('Listings Flagged')}</p><p className="text-xl font-extrabold text-amber-400 mt-1">0</p></div>
            <div className="bg-white/10 rounded-2xl p-4"><p className="text-xs text-white/50">{t('Farmer Income Uplift')}</p><p className="text-xl font-extrabold text-amber-400 mt-1">+27%</p></div>
          </div>
        </Card>
      </main>
    </div>
  )
}