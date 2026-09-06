import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Sprout, Store, ShoppingBasket, Mic, ScanLine, Banknote, ArrowDown } from 'lucide-react'
import Hero3D from '../components/Hero3D'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { useT } from '../i18n/index.jsx'

export default function LandingPage() {
  const navigate = useNavigate()
  const t = useT()
  const scrollRef = useRef(0)

  useEffect(() => {
    const handleScroll = () => {
      const doc = document.documentElement
      const max = doc.scrollHeight - doc.clientHeight
      scrollRef.current = max > 0 ? Math.min(window.scrollY / max, 1) : 0
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const roles = [
    { label: t('Farmer / FPO'), desc: t('List crops, connect with buyers'), path: '/login', icon: Sprout },
    { label: t('B2B Buyer'), desc: t('Mills, Wholesalers, Bulk Traders'), path: '/login', icon: Store },
    { label: t('B2C Buyer'), desc: t('Buy fresh produce directly'), path: '/login', icon: ShoppingBasket },
  ]

  const steps = [
    { icon: Mic, title: t('List by Voice'), desc: t('Speak your crop, quantity and price — the form fills itself.') },
    { icon: ScanLine, title: t('AI Quality Check'), desc: t('Get an instant quality grade and moisture estimate from a photo.') },
    { icon: Banknote, title: t('Escrow Payment'), desc: t('The buyer locks payment, and after delivery it goes straight to your account.') },
  ]

  const stats = [
    ['₹2.4L+', t('Extra Income Generated')],
    ['1,200+', t('Farmers Onboarded')],
    ['35% → 8%', t('Middleman Commission Cut')],
    ['4.8/5', t('Buyer Trust Rating')],
  ]

  return (
    <div className="relative w-full text-white">
      <Hero3D scrollRef={scrollRef} />

      <nav className="fixed top-0 left-0 right-0 z-30 flex justify-between items-center px-6 md:px-8 py-5">
        <h1 className="text-xl md:text-2xl font-bold tracking-wide drop-shadow-lg">
          Agri<span className="text-yellow-300">Chain</span>
        </h1>
        <div className="flex gap-3 items-center">
          <LanguageSwitcher dark />
          <button
            onClick={() => navigate('/login')}
            className="bg-yellow-500 hover:bg-yellow-400 text-black transition px-4 md:px-5 py-2 rounded-full font-semibold text-sm shadow-lg"
          >
            {t('Login')}
          </button>
        </div>
      </nav>

      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-5">
        <motion.p
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
          className="text-xs md:text-sm tracking-[0.3em] uppercase text-amber-200 font-bold mb-4"
        >
          Smart India Hackathon 2026
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}
          className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-tight drop-shadow-2xl"
        >
          {t('Straight From the Farm,')} <br />
          <span className="text-yellow-300">{t('No Middlemen.')}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.4 }}
          className="mt-6 max-w-xl text-gray-100/90 text-base md:text-lg drop-shadow-md"
        >
          {t('An AI-powered platform that connects farmers directly with buyers — fair price, guaranteed payment, real-time delivery.')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.8 }}
          className="mt-10 flex gap-4 flex-wrap justify-center"
        >
          <button onClick={() => navigate('/login')} className="bg-yellow-500 hover:bg-yellow-400 text-black transition px-7 md:px-8 py-3 rounded-full font-bold text-base md:text-lg shadow-xl">
            {t('Get Started')}
          </button>
          <button onClick={() => navigate('/ai')} className="border-2 border-white/70 hover:bg-white/10 transition px-7 md:px-8 py-3 rounded-full font-semibold text-base md:text-lg backdrop-blur">
            {t('View Demo')}
          </button>
        </motion.div>

        <motion.div
          animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.8 }}
          className="absolute bottom-8 flex flex-col items-center text-white/60 text-xs gap-1"
        >
          <span>{t('Scroll down')}</span>
          <ArrowDown size={16} />
        </motion.div>
      </section>

      <motion.section
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1 }}
        className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 px-6 md:px-8 py-10 mx-4 md:mx-8 mb-10 rounded-3xl bg-black/45 backdrop-blur-xl border border-white/10"
      >
        {stats.map(([stat, label]) => (
          <div key={label} className="text-center">
            <h3 className="text-2xl md:text-3xl font-bold text-yellow-300">{stat}</h3>
            <p className="text-gray-200 text-xs md:text-sm mt-1">{label}</p>
          </div>
        ))}
      </motion.section>

      <section className="relative z-10 px-6 md:px-8 py-16 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <p className="text-xs tracking-[0.3em] uppercase text-amber-200 font-bold mb-2">{t('How It Works')}</p>
          <h2 className="text-3xl md:text-4xl font-extrabold drop-shadow-lg">{t('3 Simple Steps')}</h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.6 }}
              className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-6 hover:bg-white/15 transition"
            >
              <div className="w-12 h-12 rounded-2xl bg-yellow-400 text-black flex items-center justify-center mb-4">
                <s.icon size={22} />
              </div>
              <h3 className="font-bold text-lg mb-2">{s.title}</h3>
              <p className="text-sm text-white/70">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative z-10 px-6 md:px-8 py-16 max-w-5xl mx-auto pb-24">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <p className="text-xs tracking-[0.3em] uppercase text-amber-200 font-bold mb-2">{t('Choose Your Role')}</p>
          <h2 className="text-3xl md:text-4xl font-extrabold drop-shadow-lg">{t('How Would You Like to Join?')}</h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5">
          {roles.map((r, i) => (
            <motion.button
              key={r.label}
              onClick={() => navigate(r.path)}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.6 }}
              whileHover={{ y: -6 }}
              whileTap={{ scale: 0.97 }}
              className="text-left bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-6 hover:bg-white/15 transition"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#16240a] text-white flex items-center justify-center mb-4">
                <r.icon size={22} />
              </div>
              <h3 className="font-bold text-lg mb-1">{r.label}</h3>
              <p className="text-sm text-white/70">{r.desc}</p>
            </motion.button>
          ))}
        </div>

        <p className="text-center text-white/40 text-xs mt-10">
          {t('Tip: tap on the field background — something will grow')}
        </p>
      </section>
    </div>
  )
}
