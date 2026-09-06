import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Package, FileText, Truck, MapPin, X, Download } from 'lucide-react'
import Navbar from '../components/Navbar'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import PageHeader from '../components/ui/PageHeader'
import { useListingsStore } from '../store/useListingsStore'
import { downloadInvoice } from '../lib/invoice'
import { useT } from '../i18n/index.jsx'

const MOQ = 10

const CATEGORY = {
  Vegetables: ['tamatar', 'tomato', 'aloo', 'potato', 'pyaz', 'onion', 'chilli', 'mirch'],
  Grains: ['gehun', 'wheat', 'rice', 'chawal', 'bajra', 'jowar', 'makka', 'maize'],
}

export default function B2BPortal() {
  const t = useT()
  const { listings, buyBulk, addBid, fetchListings } = useListingsStore()

  useEffect(() => {
    fetchListings()
    const timer = setInterval(fetchListings, 6000)
    return () => clearInterval(timer)
  }, [fetchListings])

  const [category, setCategory] = useState('All Categories')
  const [minQty, setMinQty] = useState('')
  const [location, setLocation] = useState('All Locations')
  const [filterGrade, setFilterGrade] = useState('All')
  const [toast, setToast] = useState(null)
  const [invoiceItem, setInvoiceItem] = useState(null)
  const [buyItem, setBuyItem] = useState(null)   // listing pending delivery-address confirm
  const [deliverTo, setDeliverTo] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const locations = useMemo(() => {
    const unique = new Set(listings.map((l) => l.seller?.match(/\(([^)]+)\)/)?.[1] || 'Unknown'))
    return ['All Locations', ...Array.from(unique)]
  }, [listings])

  const filtered = listings.filter((l) => {
    if (Number(l.qty) <= 0) return false
    if (filterGrade !== 'All' && l.grade !== filterGrade) return false
    if (minQty && Number(l.qty) < Number(minQty)) return false
    if (category !== 'All Categories') {
      const keys = CATEGORY[category] || []
      const crop = (l.crop || '').toLowerCase()
      if (!keys.some((k) => crop.includes(k))) return false
    }
    if (location !== 'All Locations') {
      const sellerLoc = l.seller?.match(/\(([^)]+)\)/)?.[1] || ''
      if (sellerLoc !== location) return false
    }
    return true
  })

  const handleBuyBulk = (item) => {
    if (Number(item.qty) < MOQ) {
      showToast(t('Minimum order quantity is {moq} {unit} — this listing has less stock', { moq: MOQ, unit: item.unit }))
      return
    }
    setDeliverTo('')
    setBuyItem(item)   // open delivery-address modal
  }

  const confirmBuy = async () => {
    if (!buyItem) return
    try {
      await buyBulk(buyItem.id, MOQ, deliverTo.trim() || undefined)
      showToast(t('{qty} {unit} {crop} order placed{dest} — the farmer has been notified', {
        qty: MOQ, unit: buyItem.unit, crop: buyItem.crop,
        dest: deliverTo.trim() ? ` → ${deliverTo.trim()}` : '',
      }))
      setBuyItem(null)
    } catch (e) {
      showToast(e.message || t('Could not place the order'))
    }
  }

  const handleRFQ = async (item) => {
    try {
      await addBid(item.id)
      showToast(t('RFQ submitted for {crop} — please wait for the farmer to respond', { crop: item.crop }))
    } catch (e) {
      showToast(e.message || t('Could not submit the RFQ'))
    }
  }

  const openInvoice = (item) => setInvoiceItem(item)

  return (
    <div className="min-h-screen bg-[#fdfaf3]">
      <Navbar />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0 }}
            className="fixed top-20 left-1/2 z-[999] bg-[#16240a] text-white px-5 py-3 rounded-full shadow-xl text-sm"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-5 py-10">
        <PageHeader
          eyebrow={t('B2B Portal')}
          title={t('Bulk Marketplace')}
          subtitle={t('Live farmer listings — buy bulk quantity directly from verified FPOs.')}
        />

        <div className="flex flex-wrap gap-2.5 mb-7">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="border border-black/10 bg-white rounded-full px-4 py-2 text-sm">
            <option value="All Categories">{t('All Categories')}</option>
            <option value="Vegetables">{t('Vegetables')}</option>
            <option value="Grains">{t('Grains')}</option>
          </select>

          <input
            value={minQty}
            onChange={(e) => setMinQty(e.target.value)}
            placeholder={t('Min Order Quantity')}
            inputMode="numeric"
            className="border border-black/10 bg-white rounded-full px-4 py-2 text-sm w-40"
          />

          <select value={location} onChange={(e) => setLocation(e.target.value)} className="border border-black/10 bg-white rounded-full px-4 py-2 text-sm">
            {locations.map((loc) => <option key={loc} value={loc}>{loc === 'All Locations' ? t('All Locations') : loc}</option>)}
          </select>

          <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} className="border border-black/10 bg-white rounded-full px-4 py-2 text-sm">
            <option value="All">{t('All Grades')}</option>
            <option value="A">{t('Grade A')}</option>
            <option value="B">{t('Grade B')}</option>
          </select>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mb-8">
          {filtered.map((l, i) => (
            <Card key={l.id} delay={i * 0.08} className="p-5">
              <div className="w-full h-32 rounded-xl overflow-hidden bg-black/5 mb-3">
                {l.photo ? (
                  <img src={l.photo} alt={l.crop} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-black/20 text-xs">No photo</div>
                )}
              </div>
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg text-[#16240a]">{l.crop}</h3>
                <Badge tone="green">{t('Grade')} {l.grade}</Badge>
              </div>
              <p className="flex items-center gap-1 text-sm text-black/45 mb-1">
                <MapPin size={13} />{l.seller}
              </p>
              <div className="flex items-center gap-1.5 text-sm text-black/60 mb-1">
                <Package size={14} /> {l.qty} {l.unit} {t('available')}
              </div>
              <p className="text-2xl font-extrabold text-[#16240a] mb-1">
                ₹{l.price}<span className="text-sm font-medium text-black/40">/{l.unit}</span>
              </p>
              <p className="text-xs text-black/35 mb-4">{t('MOQ')}: {MOQ} {l.unit}</p>

              <div className="flex gap-2 mt-auto">
                <Button variant="dark" className="flex-1" onClick={() => handleBuyBulk(l)}>{t('Buy Bulk')}</Button>
                <Button variant="outline" className="flex-1" onClick={() => handleRFQ(l)}>{t('Submit RFQ')}</Button>
              </div>
              <button onClick={() => openInvoice(l)} className="w-full text-xs text-black/40 hover:text-amber-600 mt-3 flex items-center justify-center gap-1">
                <FileText size={12} /> {t('Preview GST Invoice')}
              </button>
            </Card>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-3 text-center text-black/40 py-10">
              {t('No listings matched your filters.')}
            </div>
          )}
        </div>

        <Card className="p-6 md:p-8">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#16240a] mb-4">
            <Truck size={18} /> {t('Logistics & Scheduling')}
          </h2>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div>
              <p className="text-sm text-black/45">{t('Pre-Harvest Order Tracker')}</p>
              <p className="text-sm font-semibold text-[#16240a] mt-0.5">
                {t('{n} upcoming batches ready in the next 1–2 weeks', { n: listings.filter((l) => l.availability === 'Pre-Order').length })}
              </p>
            </div>
            <Button variant="primary" icon={FileText} onClick={() => showToast(t('Select a listing card to preview its GST invoice'))}>
              {t('Generate GST Invoice')}
            </Button>
          </div>
        </Card>
      </div>

      <AnimatePresence>
        {buyItem && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => setBuyItem(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              className="relative bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl text-[#16240a]"
            >
              <button onClick={() => setBuyItem(null)} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-black/5">
                <X size={18} />
              </button>
              <h2 className="font-extrabold text-lg flex items-center gap-2"><MapPin size={18} /> {t('Delivery Address')}</h2>
              <p className="text-xs text-black/45 mt-1 mb-4">
                {buyItem.crop} · {MOQ} {buyItem.unit} · {t('Where should this be delivered? (city/town — map tracking will be set to this)')}
              </p>
              <input
                autoFocus value={deliverTo}
                onChange={(e) => setDeliverTo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && confirmBuy()}
                placeholder={t('e.g. Pimpri Chinchwad, Pune')}
                className="w-full px-4 py-2.5 rounded-xl border border-black/15 focus:border-[#16240a] outline-none text-sm"
              />
              <p className="text-[11px] text-black/35 mt-2">{t('If left blank, it will be delivered to your registered city.')}</p>
              <Button variant="dark" className="w-full mt-5" onClick={confirmBuy}>
                {t('Confirm Order')} · ₹{(Number(buyItem.price) * MOQ).toLocaleString('en-IN')}
              </Button>
            </motion.div>
          </div>
        )}
        {invoiceItem && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => setInvoiceItem(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              className="relative bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl text-[#16240a]"
            >
              <button onClick={() => setInvoiceItem(null)} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-black/5">
                <X size={18} />
              </button>

              <div className="flex items-center gap-2 mb-1">
                <FileText size={18} className="text-amber-600" />
                <h2 className="font-extrabold text-lg">{t('GST Invoice Preview')}</h2>
              </div>
              <p className="text-xs text-black/40 mb-5">{t('Invoice ID')}: AGC-{invoiceItem.id.toString().slice(-6)}</p>

              <div className="space-y-2 text-sm border-t border-black/5 pt-4">
                <div className="flex justify-between"><span className="text-black/45">{t('Seller')}</span><span className="font-semibold">{invoiceItem.seller}</span></div>
                <div className="flex justify-between"><span className="text-black/45">{t('Crop')}</span><span className="font-semibold">{invoiceItem.crop}</span></div>
                <div className="flex justify-between"><span className="text-black/45">{t('Quantity')}</span><span className="font-semibold">{MOQ} {invoiceItem.unit}</span></div>
                <div className="flex justify-between"><span className="text-black/45">{t('Rate')}</span><span className="font-semibold">₹{invoiceItem.price}/{invoiceItem.unit}</span></div>
                <div className="flex justify-between"><span className="text-black/45">{t('Subtotal')}</span><span className="font-semibold">₹{Number(invoiceItem.price) * MOQ}</span></div>
                <div className="flex justify-between"><span className="text-black/45">{t('GST (5%)')}</span><span className="font-semibold">₹{Math.round(Number(invoiceItem.price) * MOQ * 0.05)}</span></div>
                <div className="flex justify-between pt-2 border-t border-black/10 text-base">
                  <span className="font-bold">{t('Total')}</span>
                  <span className="font-extrabold text-amber-600">
                    ₹{Number(invoiceItem.price) * MOQ + Math.round(Number(invoiceItem.price) * MOQ * 0.05)}
                  </span>
                </div>
              </div>

              <Button variant="dark" icon={Download} className="w-full mt-6" onClick={() => downloadInvoice({
                id: invoiceItem.id,
                crop: invoiceItem.crop,
                seller: invoiceItem.seller,
                buyer_name: 'B2B Buyer',
                qty: MOQ,
                unit: invoiceItem.unit,
                amount: Number(invoiceItem.price) * MOQ,
                gst: Math.round(Number(invoiceItem.price) * MOQ * 0.05),
                status: 'Proforma (Pre-Order)',
                created_at: new Date().toISOString(),
              })}>
                {t('Download Invoice')}
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
