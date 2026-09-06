import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Package, Download, CheckCircle2, Clock, Truck, IndianRupee, RefreshCw, MapPin, Trash2 } from 'lucide-react'
import Navbar from '../components/Navbar'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import PageHeader from '../components/ui/PageHeader'
import { useAuthStore } from '../store/useAuthStore'
import { downloadInvoice } from '../lib/invoice'
import TrackModal from '../components/TrackModal'
import api from '../lib/api'
import { useT } from '../i18n/index.jsx'

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

function statusTone(s) {
  if (s === 'Farmer Credited') return 'green'
  if (s === 'Delivered') return 'amber'
  if (s === 'In Escrow') return 'blue'
  if (s === 'Sold Out' || s === 'Order Placed') return 'neutral'
  return 'neutral'
}

export default function OrdersPage() {
  const t = useT()
  const { user } = useAuthStore()
  const isFarmer = user?.role === 'farmer'
  const [orders, setOrders] = useState([])
  const [escrow, setEscrow] = useState({ locked: 0, pending: 0, credited: 0 })
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [trackId, setTrackId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [o, e] = await Promise.all([api.getOrders(), api.escrowSummary()])
      setOrders(o)
      setEscrow(e)
    } catch (err) {
      setToast(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2500) }

  const advance = async (order, status) => {
    try {
      await api.setOrderStatus(order.id, status)
      showToast(status === 'Delivered' ? t('Delivery confirmed') : t('Payment released'))
      load()
    } catch (e) {
      showToast(e.message)
    }
  }

  return (
    <div className="min-h-screen bg-[#fdfaf3]">
      <Navbar />
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[999] bg-[#16240a] text-white px-5 py-3 rounded-full shadow-xl text-sm">{toast}</div>
      )}

      <div className="max-w-6xl mx-auto px-5 py-10">
        <PageHeader
          eyebrow={isFarmer ? t('Incoming Orders') : t('My Purchases')}
          title={t('Orders & Escrow')}
          subtitle={isFarmer ? t('Manage buyer orders, delivery and payment release from here.') : t('Your orders, delivery confirmation and GST invoice download.')}
        />

        {/* live escrow cards */}
        <div className="grid grid-cols-3 gap-4 mb-7">
          <Card className="p-5"><p className="text-xs text-black/45 font-semibold">{t('In Escrow')}</p><p className="text-xl font-extrabold text-[#16240a] mt-1">{inr(escrow.locked)}</p></Card>
          <Card className="p-5" delay={0.05}><p className="text-xs text-black/45 font-semibold">{t('Pending Release')}</p><p className="text-xl font-extrabold text-amber-600 mt-1">{inr(escrow.pending)}</p></Card>
          <Card className="p-5" delay={0.1}><p className="text-xs text-black/45 font-semibold">{isFarmer ? t('Credited') : t('Completed')}</p><p className="text-xl font-extrabold text-emerald-700 mt-1">{inr(escrow.credited)}</p></Card>
        </div>

        <Card className="p-6 md:p-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-[#16240a]"><Package size={18} /> {t('Order History')}</h2>
            <button onClick={load} className="flex items-center gap-1.5 text-sm text-black/50 hover:text-[#16240a]"><RefreshCw size={14} /> {t('Refresh')}</button>
          </div>

          {loading ? (
            <p className="text-center text-black/40 py-10">{t('Loading orders...')}</p>
          ) : orders.length === 0 ? (
            <p className="text-center text-black/40 py-10">{t('No orders yet.')}</p>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <motion.div key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl border border-black/[0.06] bg-white">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-[#16240a]">{o.crop}</p>
                      <Badge tone={statusTone(o.status)}>{o.status}</Badge>
                    </div>
                    <p className="text-xs text-black/45 mt-0.5">
                      {o.qty} {o.unit} · {inr(Number(o.amount) + Number(o.gst || 0))} ({t('incl. GST')}) ·{' '}
                      {isFarmer ? `${t('Buyer')}: ${o.buyer_name || o.buyer_type}` : o.seller}
                    </p>
                    <p className="text-[11px] text-black/30 mt-0.5">{t('Order')} #{o.id} · {o.created_at}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" icon={MapPin} onClick={() => setTrackId(o.id)}>{t('Track')}</Button>
                    <Button variant="outline" icon={Download} onClick={() => downloadInvoice(o)}>{t('Invoice')}</Button>

                    {/* farmer accepts/rejects a newly placed order */}
                    {isFarmer && (o.status === 'Order Placed' || o.status === 'In Escrow') && (
                      <>
                        <Button variant="primary" icon={CheckCircle2} onClick={() => advance(o, 'In Escrow')}>{t('Accept Order')}</Button>
                        <Button variant="outline" icon={Trash2} onClick={async () => {
                          if (!confirm(t('Reject this order? It will be deleted.'))) return
                          try { await api.deleteOrder(o.id); showToast(t('Order rejected')); load() } catch (e) { showToast(e.message) }
                        }}>{t('Reject')}</Button>
                      </>
                    )}

                    {/* buyer confirms delivery */}
                    {!isFarmer && o.status === 'In Escrow' && (
                      <Button variant="dark" icon={Truck} onClick={() => advance(o, 'Delivered')}>{t('Confirm Delivery')}</Button>
                    )}
                    {/* farmer releases payment once delivered */}
                    {isFarmer && o.status === 'Delivered' && (
                      <Button variant="primary" icon={IndianRupee} onClick={() => advance(o, 'Farmer Credited')}>{t('Release Payment')}</Button>
                    )}
                    {o.status === 'Farmer Credited' && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 text-sm font-semibold px-3"><CheckCircle2 size={15} /> {t('Complete')}</span>
                    )}
                    {isFarmer && o.status === 'In Escrow' && (
                      <span className="inline-flex items-center gap-1 text-blue-600 text-sm px-3"><Clock size={15} /> {t('Awaiting delivery')}</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {trackId && (
        <TrackModal orderId={trackId} canManage={isFarmer} onClose={() => { setTrackId(null); load() }} />
      )}
    </div>
  )
}
