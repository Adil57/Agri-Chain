import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell, CalendarDays, Camera, CheckCircle2, Image as ImageIcon,
  MapPin, Mic, Plus, Radio, Trash2, Truck, Wallet, X,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import PageHeader from '../components/ui/PageHeader'
import { useListingsStore } from '../store/useListingsStore'
import { useNotificationStore } from '../store/useNotificationStore'
import { useAuthStore } from '../store/useAuthStore'
import api from '../lib/api'
import { useT } from '../i18n/index.jsx'

function statusTone(status) {
  if (status === 'Escrow Paid') return 'green'
  if (status === 'In-Transit') return 'blue'
  if (status === 'Bid Received') return 'amber'
  if (status === 'Order Placed') return 'blue'
  if (status === 'Sold Out') return 'neutral'
  return 'neutral'
}

function generateGrade(cropName = '') {
  const crop = cropName.toLowerCase()
  if (crop.includes('tamatar') || crop.includes('tomato')) return { grade: 'A', moisture: '12%', confidence: '94%' }
  if (crop.includes('pyaz') || crop.includes('onion')) return { grade: 'B', moisture: '15%', confidence: '89%' }
  if (crop.includes('aloo') || crop.includes('potato')) return { grade: 'A', moisture: '13%', confidence: '91%' }
  return { grade: Math.random() > 0.35 ? 'A' : 'B', moisture: `${11 + Math.floor(Math.random() * 5)}%`, confidence: '90%' }
}

export default function FarmerDashboard() {
  const t = useT()
  const fileRef = useRef(null)
  const { listings, addListing, deleteListing, addBid, fetchListings } = useListingsStore()
  const { notifications, fetchNotifications } = useNotificationStore()
  const { user } = useAuthStore()
  const firstName = user?.name?.trim()?.split(' ')[0] || t('Farmer')

  useEffect(() => {
    fetchListings()
    fetchNotifications()
    api.escrowSummary().then(setEscrow).catch(() => {})
  }, [fetchListings, fetchNotifications])

  const [form, setForm] = useState({
    crop: '', qty: '', unit: 'Quintal', price: '',
    bulk_price: '', retail_price: '',
    availability: 'Available Now', harvestDate: '', pickup: 'Farm-Gate Pickup',
  })

  const [listening, setListening] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [gradeResult, setGradeResult] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageBase64, setImageBase64] = useState(null)
  const [toast, setToast] = useState(null)
  const [voiceText, setVoiceText] = useState('')
  const [escrow, setEscrow] = useState({ locked: 0, pending: 0, credited: 0 })

  const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

  const stats = useMemo(() => {
    const active = listings.length
    const totalQty = listings.reduce((sum, item) => sum + Number(item.qty || 0), 0)
    const totalBids = listings.reduce((sum, item) => sum + Number(item.bids || 0), 0)
    const escrow = listings.filter((item) => item.status === 'Escrow Paid').length
    return { active, totalQty, totalBids, escrow }
  }, [listings])

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(null), 2500)
  }

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const parseVoiceText = (text) => {
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
      ['Quintal', ['quintal', 'kwintal', 'क्विंटल', 'कुंतल']],
    ]
    const NUM = {
      ek: 1, 'एक': 1, do: 2, 'दो': 2, teen: 3, 'तीन': 3, char: 4, chaar: 4, 'चार': 4,
      panch: 5, paanch: 5, 'पांच': 5, 'पाँच': 5, chhe: 6, 'छह': 6, saat: 7, 'सात': 7,
      aath: 8, 'आठ': 8, nau: 9, 'नौ': 9, das: 10, 'दस': 10, gyarah: 11, 'ग्यारह': 11,
      barah: 12, 'बारह': 12, satrah: 17, 'सत्रह': 17, atharah: 18, athaarah: 18, 'अठारह': 18,
      bees: 20, 'बीस': 20, tees: 30, 'तीस': 30, chalis: 40, chaalis: 40, 'चालीस': 40,
      pachas: 50, pachaas: 50, 'पचास': 50, saath: 60, 'साठ': 60, sattar: 70, 'सत्तर': 70,
      assi: 80, 'अस्सी': 80, nabbe: 90, 'नब्बे': 90,
    }
    const MULT = { sau: 100, 'सौ': 100, hazar: 1000, hajar: 1000, hazaar: 1000, 'हजार': 1000, 'हज़ार': 1000, lakh: 100000, 'लाख': 100000 }
    const devToAscii = (s) => s.replace(/[०-९]/g, (d) => '०१२३४५६७८९'.indexOf(d))
    const wordsToNumber = (toks) => {
      let total = 0, cur = 0, found = false
      for (const t of toks) {
        if (t in NUM) { cur += NUM[t]; found = true }
        else if (t in MULT) { cur = (cur || 1) * MULT[t]; total += cur; cur = 0; found = true }
        else if (cur) { total += cur; cur = 0 }
      }
      return found ? total + cur : null
    }

    const lower = devToAscii(text).toLowerCase()
    const tokens = lower.replace(/[.,₹]/g, ' ').split(/\s+/).filter(Boolean)

    let crop = ''
    for (const [name, keys] of CROPS) if (keys.some((k) => lower.includes(k.toLowerCase()))) { crop = name; break }

    let unit = '', unitIdx = -1
    for (const [name, keys] of UNITS) {
      const i = tokens.findIndex((t) => keys.some((k) => t.includes(k.toLowerCase())))
      if (i !== -1) { unit = name; unitIdx = i; break }
    }

    const priceCue = ['rupaye', 'rupees', 'rupee', 'rs', 'price', 'daam', 'bhav', 'रुपये', 'रुपए', 'रुपया']
    const priceIdx = tokens.findIndex((t) => priceCue.some((c) => t.includes(c)))

    // QTY: numbers before the unit (or before price cue)
    const sliceForQty = unitIdx !== -1 ? tokens.slice(0, unitIdx)
      : priceIdx !== -1 ? tokens.slice(0, priceIdx) : tokens
    let qty = ''
    const qDigit = sliceForQty.find((t) => /^\d{1,7}$/.test(t))
    if (qDigit) qty = qDigit
    else { const n = wordsToNumber(sliceForQty); if (n) qty = String(n) }

    // PRICE
    let price = ''
    const pm = lower.match(/([\d,]{2,7})\s*(?:rupaye|rupees|rupee|rs|₹|रुपये|रुपए)/)
      || lower.match(/(?:₹|rs\.?|rupaye|rupees|price|daam|bhav|रुपये|रुपए)\s*([\d,]{2,7})/)
    if (pm) price = pm[1].replace(/,/g, '')
    if (!price) {
      const start = unitIdx !== -1 ? unitIdx + 1 : (qDigit ? tokens.indexOf(qDigit) + 1 : 0)
      const rest = tokens.slice(start)
      const pDigit = rest.find((t) => /^\d{2,7}$/.test(t) && t !== qty)
      if (pDigit) price = pDigit
      else { const n = wordsToNumber(rest); if (n && String(n) !== qty) price = String(n) }
    }

    setForm((prev) => ({
      ...prev,
      crop: crop || prev.crop,
      qty: qty || prev.qty,
      price: price || prev.price,
      unit: unit || prev.unit,
    }))
    setVoiceText(text)

    const parts = []
    if (crop) parts.push(crop)
    if (qty) parts.push(`${qty}${unit ? ' ' + unit : ''}`)
    if (price) parts.push(`₹${price}`)
    return parts.length ? parts.join(' · ') : ''
  }

  const handleVoiceClick = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    // Browser doesn't support Web Speech API (e.g. Firefox) -> honest fallback
    if (!SpeechRecognition) {
      setListening(true)
      setTimeout(() => {
        const got = parseVoiceText('Tamatar 50 quintal 1800 rupaye')
        setListening(false)
        showToast(t('Your browser does not support voice — filled a demo sample: {got}', { got }))
      }, 1200)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'hi-IN'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    setListening(true)

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      const got = parseVoiceText(transcript)
      showToast(got ? t('Got it: {got}', { got }) : t('Heard: "{transcript}" — please check the form', { transcript }))
    }
    recognition.onerror = (e) => {
      setListening(false)
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        showToast(t('Mic permission needed — please allow it in your browser'))
      } else if (e.error === 'no-speech') {
        showToast(t('Could not hear anything, please try speaking again'))
      } else {
        showToast(t('Voice input failed, please try again'))
      }
    }
    recognition.onend = () => setListening(false)

    try {
      recognition.start()
    } catch {
      setListening(false)
      showToast(t('Voice is already running, stop and press again'))
    }
  }

  const handlePhotoUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setImagePreview(URL.createObjectURL(file))
    setImageBase64(null)
    setGradeResult(null)
    setAiLoading(true)

    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result // data:image/...;base64,....
      const base64 = String(dataUrl).split(',')[1]
      setImageBase64(base64)
      try {
        const g = await api.gradeImage(base64, file.type || 'image/jpeg', form.crop)
        setGradeResult({ grade: g.grade, moisture: g.moisture, confidence: g.confidence, note: g.note })
        // if farmer hadn't typed a crop, use the AI-detected one
        if (!form.crop && g.crop) updateForm('crop', g.crop)
        showToast(t('AI Quality Grade: {grade}{note}', { grade: g.grade, note: g.note ? ' — ' + g.note : '' }))
      } catch (e) {
        // graceful fallback so a demo never gets stuck if AI is down/rate-limited
        const grade = generateGrade(form.crop)
        setGradeResult(grade)
        showToast(t('AI busy — offline estimate: Grade {grade}', { grade: grade.grade }))
      } finally {
        setAiLoading(false)
      }
    }
    reader.onerror = () => {
      setAiLoading(false)
      showToast(t('Trouble reading the photo — please try again'))
    }
    reader.readAsDataURL(file)
  }

  const resetForm = () => {
    setForm({ crop: '', qty: '', unit: 'Quintal', price: '', availability: 'Available Now', harvestDate: '', pickup: 'Farm-Gate Pickup' })
    setGradeResult(null)
    setImagePreview(null)
    setImageBase64(null)
    setVoiceText('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleAddListing = async () => {
    if (!form.crop.trim() || !form.qty.trim() || !form.price.trim()) {
      showToast(t('Crop name, quantity and price are required'))
      return
    }
    // AI grading photo is mandatory — the same upload used for quality grading must exist
    if (!imagePreview) {
      showToast(t('Please upload a crop photo for AI quality grading before listing'))
      return
    }
    if (!gradeResult) {
      showToast(t('Please wait for the AI grade result after uploading the photo'))
      return
    }
    if (form.availability === 'Pre-Order' && !form.harvestDate) {
      showToast(t('Please select a harvest date for pre-order'))
      return
    }

    const grade = gradeResult || generateGrade(form.crop)

    try {
      await addListing({
        crop: form.crop.trim(),
        qty: form.qty.trim(),
        unit: form.unit,
        price: form.price.trim(),
        bulk_price: form.bulk_price.trim() || form.price.trim(),
        retail_price: form.retail_price.trim() || '',
        availability: form.availability,
        harvest_date: form.harvestDate,
        pickup: form.pickup,
        grade: grade.grade,
        moisture: grade.moisture,
        photo: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : '',
      })
      resetForm()
      showToast(t('Crop listing added successfully — it is also visible on the B2B portal'))
    } catch (e) {
      showToast(e.message || t('Could not add the listing'))
    }
  }

  return (
    <div className="min-h-screen bg-[#fdfaf3]">
      <Navbar />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-20 left-1/2 z-[999] bg-[#16240a] text-white px-5 py-3 rounded-full shadow-xl text-sm"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-5 py-10">
        <PageHeader
          eyebrow={t('Farmer Dashboard')}
          title={t('Welcome, {name}', { name: firstName })}
          subtitle={t('Voice-first crop listing, AI quality grading and direct buyer orders in one place.')}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
          <Card className="p-5" delay={0}>
            <p className="text-xs text-black/45 font-semibold">{t('Active Listings')}</p>
            <p className="text-2xl font-extrabold text-[#16240a] mt-1">{stats.active}</p>
          </Card>
          <Card className="p-5" delay={0.05}>
            <p className="text-xs text-black/45 font-semibold">{t('Total Quantity')}</p>
            <p className="text-2xl font-extrabold text-[#16240a] mt-1">{stats.totalQty}</p>
          </Card>
          <Card className="p-5" delay={0.1}>
            <p className="text-xs text-black/45 font-semibold">{t('Buyer Bids')}</p>
            <p className="text-2xl font-extrabold text-[#16240a] mt-1">{stats.totalBids}</p>
          </Card>
          <Card className="p-5" delay={0.15}>
            <p className="text-xs text-black/45 font-semibold">{t('Escrow Orders')}</p>
            <p className="text-2xl font-extrabold text-[#16240a] mt-1">{stats.escrow}</p>
          </Card>
        </div>

        <div className="grid lg:grid-cols-[1.4fr_0.8fr] gap-6 mb-7">
          <Card className="p-6 md:p-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-extrabold text-[#16240a]">{t('Add New Crop')}</h2>
                <p className="text-sm text-black/45 mt-1">{t('This listing will also appear on the B2B and B2C portals.')}</p>
              </div>
              <Button variant="outline" icon={X} onClick={resetForm}>{t('Reset')}</Button>
            </div>

            <div className="flex flex-col items-center mb-8">
              <motion.button
                onClick={handleVoiceClick}
                whileTap={{ scale: 0.94 }}
                className="relative w-20 h-20 rounded-full flex items-center justify-center bg-[#16240a] text-white shadow-lg"
              >
                {listening && (
                  <motion.span
                    className="absolute inset-0 rounded-full bg-amber-400/40"
                    animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  />
                )}
                <Mic size={30} className="relative z-10" />
              </motion.button>
              <p className="text-sm text-black/45 mt-3">{listening ? t('Listening...') : t('Add crop by voice')}</p>
              {voiceText && <p className="text-xs bg-amber-50 text-amber-700 px-3 py-1 rounded-full mt-2">{t('Captured')}: {voiceText}</p>}
            </div>

            <div className="grid md:grid-cols-4 gap-3 mb-5">
              <input value={form.crop} onChange={(e) => updateForm('crop', e.target.value)} placeholder={t('Crop Name')} className="md:col-span-2 border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
              <input value={form.qty} onChange={(e) => updateForm('qty', e.target.value)} placeholder={t('Quantity')} inputMode="numeric" className="border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
              <select value={form.unit} onChange={(e) => updateForm('unit', e.target.value)} className="border border-black/10 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/50">
                <option>Quintal</option>
                <option>Kg</option>
              </select>
            </div>

            <div className="grid md:grid-cols-2 gap-3 mb-6">
              <input value={form.price} onChange={(e) => updateForm('price', e.target.value)} placeholder={t('Base List Price (₹/unit)')} inputMode="numeric" className="border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
              {form.availability === 'Pre-Order' ? (
                <input type="date" value={form.harvestDate} onChange={(e) => updateForm('harvestDate', e.target.value)} className="border border-black/10 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
              ) : (
                <div className="border border-black/10 rounded-xl px-4 py-3 text-sm bg-green-50 text-green-700 font-semibold">{t('Immediate pickup enabled')}</div>
              )}
            </div>

            {/* Dual pricing: bulk (B2B) + small order 5kg expected (B2C) */}
            <div className="grid md:grid-cols-2 gap-3 mb-6">
              <div>
                <p className="text-[11px] font-semibold text-black/45 mb-1.5 flex items-center gap-1"><Package size={12} /> {t('Bulk Order Price (₹/Quintal) — for B2B buyers')}</p>
                <input value={form.bulk_price} onChange={(e) => updateForm('bulk_price', e.target.value)} placeholder={t('e.g. 1800')} inputMode="numeric" className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-black/45 mb-1.5 flex items-center gap-1"><Package size={12} /> {t('Small Order (5kg) Expected Price (₹/kg) — for B2C')}</p>
                <input value={form.retail_price} onChange={(e) => updateForm('retail_price', e.target.value)} placeholder={t('e.g. 24')} inputMode="numeric" className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5 mb-6">
              <div>
                <p className="flex items-center gap-1.5 font-semibold text-sm text-[#16240a] mb-2.5"><Radio size={14} /> {t('Harvest Availability')}</p>
                {['Available Now', 'Pre-Order'].map((opt) => (
                  <label key={opt} className="flex items-center gap-2.5 mb-2 text-sm text-black/70 cursor-pointer">
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${form.availability === opt ? 'border-amber-500' : 'border-black/20'}`}>
                      {form.availability === opt && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                    </span>
                    <input type="radio" className="hidden" checked={form.availability === opt} onChange={() => updateForm('availability', opt)} />
                    {opt === 'Available Now' ? t('Available Now (Immediate Pickup)') : t('Pre-Order (Harvest Date)')}
                  </label>
                ))}
              </div>
              <div>
                <p className="flex items-center gap-1.5 font-semibold text-sm text-[#16240a] mb-2.5"><MapPin size={14} /> {t('Pickup Preference')}</p>
                {['Farm-Gate Pickup', 'FPO Hub Drop-off'].map((opt) => (
                  <label key={opt} className="flex items-center gap-2.5 mb-2 text-sm text-black/70 cursor-pointer">
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${form.pickup === opt ? 'border-amber-500' : 'border-black/20'}`}>
                      {form.pickup === opt && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                    </span>
                    <input type="radio" className="hidden" checked={form.pickup === opt} onChange={() => updateForm('pickup', opt)} />
                    {t(opt)}
                  </label>
                ))}
              </div>
            </div>

            <div className="border-2 border-dashed border-amber-300/60 bg-amber-50/40 rounded-2xl p-5 mb-6">
              <div className="flex flex-col md:flex-row gap-5 items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center border border-black/5 overflow-hidden">
                    {imagePreview ? <img src={imagePreview} alt={t('Crop preview')} className="w-full h-full object-cover" /> : <ImageIcon size={24} className="text-black/35" />}
                  </div>
                  <div>
                    <p className="font-bold text-[#16240a]">{t('AI Quality Upload')}</p>
                    <p className="text-sm text-black/45">{t('Upload a crop photo to generate a quality grade.')}</p>
                  </div>
                </div>
                <div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  <Button variant="dark" icon={Camera} onClick={() => fileRef.current?.click()}>{t('Upload Photo')}</Button>
                </div>
              </div>

              <AnimatePresence>
                {aiLoading && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 text-sm text-amber-700 font-semibold">
                    {t('AI model analyzing color, size, surface damage and moisture estimate...')}
                  </motion.div>
                )}
                {gradeResult && !aiLoading && (
                  <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="mt-4 grid md:grid-cols-3 gap-3">
                    <div className="bg-white rounded-xl p-3 border border-black/5"><p className="text-xs text-black/40">{t('Quality Grade')}</p><p className="font-extrabold text-emerald-700">{t('Grade')} {gradeResult.grade}</p></div>
                    <div className="bg-white rounded-xl p-3 border border-black/5"><p className="text-xs text-black/40">{t('Moisture')}</p><p className="font-extrabold text-[#16240a]">{gradeResult.moisture}</p></div>
                    <div className="bg-white rounded-xl p-3 border border-black/5"><p className="text-xs text-black/40">{t('AI Confidence')}</p><p className="font-extrabold text-[#16240a]">{gradeResult.confidence}</p></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button variant="primary" icon={Plus} className="w-full md:w-auto px-8 py-3" onClick={handleAddListing}>{t('List Crop')}</Button>
          </Card>

          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="flex items-center gap-2 font-extrabold text-[#16240a] mb-4"><Bell size={18} /> {t('Farmer Alerts')}</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {notifications.length === 0 && (
                  <p className="text-sm text-black/40 text-center py-4">{t('No new alerts')}</p>
                )}
                {notifications.slice(0, 8).map((n) => (
                  <div key={n.id} className={`p-3 rounded-2xl bg-amber-50 text-amber-900 text-sm ${n.read ? 'opacity-60' : ''}`}>
                    {t(n.text)}
                    <p className="text-xs text-amber-600/60 mt-1">{n.time}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="flex items-center gap-2 font-extrabold text-[#16240a] mb-4"><Wallet size={18} /> {t('Escrow Summary')}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-black/45">{t('In Escrow (Locked)')}</span><span className="font-bold text-[#16240a]">{inr(escrow.locked)}</span></div>
                <div className="flex justify-between"><span className="text-black/45">{t('Delivered (Pending Release)')}</span><span className="font-bold text-[#16240a]">{inr(escrow.pending)}</span></div>
                <div className="flex justify-between"><span className="text-black/45">{t('Credited to You')}</span><span className="font-bold text-emerald-700">{inr(escrow.credited)}</span></div>
              </div>
            </Card>
          </div>
        </div>

        <Card className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl font-extrabold text-[#16240a]">{t('Active Listings')}</h2>
              <p className="text-sm text-black/45 mt-1">{t('Live syncing with the B2B and B2C portals.')}</p>
            </div>
          </div>

          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[850px]">
              <thead>
                <tr className="text-left text-black/40 border-b border-black/[0.06] text-xs uppercase tracking-wide">
                  <th className="pb-3 px-2 font-semibold">{t('Crop')}</th>
                  <th className="pb-3 px-2 font-semibold">{t('Quantity')}</th>
                  <th className="pb-3 px-2 font-semibold">{t('Price')}</th>
                  <th className="pb-3 px-2 font-semibold">{t('Quality')}</th>
                  <th className="pb-3 px-2 font-semibold">{t('Availability')}</th>
                  <th className="pb-3 px-2 font-semibold">{t('Pickup')}</th>
                  <th className="pb-3 px-2 font-semibold">{t('Bids')}</th>
                  <th className="pb-3 px-2 font-semibold">{t('Status')}</th>
                  <th className="pb-3 px-2 font-semibold">{t('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((item) => (
                  <tr key={item.id} className="border-b border-black/[0.04] last:border-0">
                    <td className="py-4 px-2"><p className="font-extrabold text-[#16240a]">{item.crop}</p><p className="text-xs text-black/35">{item.created_at || item.createdAt}</p></td>
                    <td className="py-4 px-2 text-black/65">{item.qty} {item.unit}</td>
                    <td className="py-4 px-2 font-semibold text-[#16240a]">₹{item.price}/{item.unit}</td>
                    <td className="py-4 px-2"><Badge tone={item.grade === 'A' ? 'green' : 'amber'}>{t('Grade')} {item.grade} · {item.moisture}</Badge></td>
                    <td className="py-4 px-2 text-black/60"><div className="flex items-center gap-1.5"><CalendarDays size={14} />{item.availability}</div></td>
                    <td className="py-4 px-2 text-black/60"><div className="flex items-center gap-1.5"><Truck size={14} />{item.pickup}</div></td>
                    <td className="py-4 px-2 font-bold text-[#16240a]">{item.bids}</td>
                    <td className="py-4 px-2"><Badge tone={statusTone(item.status)}>{item.status}</Badge></td>
                    <td className="py-4 px-2">
                      <div className="flex gap-2">
                        <button onClick={() => addBid(item.id)} className="inline-flex items-center justify-center px-3 py-2 rounded-full text-xs font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 transition">
                          <Radio size={13} className="mr-1" /> {t('Bid')}
                        </button>
                        <button onClick={() => deleteListing(item.id)} className="inline-flex items-center justify-center px-3 py-2 rounded-full text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 transition">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {listings.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center text-black/40 py-10">
                      {t('No listings yet — add a new crop above.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
