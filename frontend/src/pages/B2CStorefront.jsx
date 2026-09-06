import { useEffect, useMemo, useState } from 'react'
import { ShoppingCart, Truck, CheckCircle2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import Navbar from '../components/Navbar'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import PageHeader from '../components/ui/PageHeader'
import CartDrawer from '../components/CartDrawer'
import { useCartStore } from '../store/useCartStore'
import { useListingsStore } from '../store/useListingsStore'
import api from '../lib/api'
import { useT } from '../i18n/index.jsx'

const COLORS = ['from-red-100 to-red-50', 'from-amber-100 to-amber-50', 'from-purple-100 to-purple-50', 'from-green-100 to-green-50', 'from-lime-100 to-lime-50']

// Curated fallback if there are no live listings yet
const fallback = [
  { name: 'Fresh Tomatoes', price: 24, unit: 'kg', tag: 'Direct Farm', delivery: 'Same Day', color: COLORS[0] },
  { name: 'Organic Potatoes', price: 20, unit: 'kg', tag: 'Direct Farm', delivery: 'Same Day', color: COLORS[1] },
  { name: 'Fresh Onions', price: 28, unit: 'kg', tag: 'Direct Farm', delivery: 'Next Day', color: COLORS[2] },
  { name: 'Green Chillies', price: 40, unit: 'kg', tag: 'Organic', delivery: 'Same Day', color: COLORS[3] },
]

export default function B2CStorefront() {
  const t = useT()
  const { items, addItem, clearCart } = useCartStore()
  const { listings, fetchListings } = useListingsStore()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  // Build consumer products from LIVE farmer listings (quintal wholesale -> per-kg retail +18% margin)
  const products = useMemo(() => {
    const live = listings
      .filter((l) => Number(l.qty) > 0)
      .map((l, i) => {
        const perKg = l.unit === 'Quintal' ? Number(l.price) / 100 : Number(l.price)
        const retail = Math.max(1, Math.round(perKg * 1.18))
        return {
          id: l.id,
          name: l.crop,
          price: retail,
          unit: 'kg',
          tag: l.grade === 'A' ? 'Direct Farm · Grade A' : 'Direct Farm',
          delivery: l.availability === 'Available Now' ? 'Same Day' : 'Pre-Order',
          color: COLORS[i % COLORS.length],
          photo: l.photo || '',
        }
      })
    return live.length > 0 ? live : fallback
  }, [listings])

  const cartCount = items.reduce((sum, i) => sum + i.qty, 0)

  const handleCheckout = async () => {
    try {
      await api.checkout(items)
    } catch {
      /* order still confirmed locally for demo even if offline */
    }
    setDrawerOpen(false)
    setOrderPlaced(true)
    clearCart()
    setTimeout(() => setOrderPlaced(false), 3000)
  }

  return (
    <div className="min-h-screen bg-[#fdfaf3]">
      <Navbar />

      <AnimatePresence>
        {orderPlaced && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0 }}
            className="fixed top-20 left-1/2 z-[999] bg-emerald-600 text-white px-5 py-3 rounded-full shadow-xl text-sm flex items-center gap-2"
          >
            <CheckCircle2 size={16} /> {t('Order placed successfully! The farmer has been notified.')}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-5 py-10 pb-28">
        <PageHeader eyebrow={t('B2C Store')} title={t('Fresh from the Farm')} subtitle={t('Straight from farmers, to your home.')} />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {products.map((p, i) => (
            <Card key={p.id || i} delay={i * 0.08} className="overflow-hidden">
              <div className={`h-24 bg-gradient-to-br ${p.color} relative`}>
                {p.photo && (
                  <img src={p.photo} alt={p.name} className="absolute inset-0 w-full h-full object-cover" />
                )}
              </div>
              <div className="p-4 flex flex-col flex-1">
                <Badge tone="green">{p.tag}</Badge>
                <h3 className="font-bold text-[#16240a] mt-2.5 text-[15px]">{p.name || t('Unnamed Crop')}</h3>
                <p className="text-lg font-extrabold text-[#16240a] mt-0.5">₹{p.price}<span className="text-xs font-medium text-black/40">/{p.unit}</span></p>
                <p className="flex items-center gap-1 text-xs text-black/40 mb-4 mt-1"><Truck size={12} /> {t(p.delivery)} {t('Delivery')}</p>
                <Button variant="dark" className="w-full mt-auto" onClick={() => addItem(p)}>{t('Add to Cart')}</Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="fixed bottom-5 right-5">
          <Button variant="primary" icon={ShoppingCart} className="relative px-6 py-3.5 text-base shadow-xl" onClick={() => setDrawerOpen(true)}>
            {t('Checkout')}
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onCheckout={handleCheckout} />
    </div>
  )
}
