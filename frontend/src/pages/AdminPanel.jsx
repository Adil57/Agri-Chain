import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Shield, Users, ShoppingBag, Package, CheckCircle2, XCircle, Trash2, RefreshCw } from 'lucide-react'
import Navbar from '../components/Navbar'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import PageHeader from '../components/ui/PageHeader'
import api from '../lib/api'
import { useT } from '../i18n/index.jsx'

export default function AdminPanel() {
  const t = useT()
  const [tab, setTab] = useState('stats')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [orders, setOrders] = useState([])
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2500) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, u, o, l] = await Promise.all([
        api.adminStats(), api.adminUsers(), api.adminOrders(), api.adminListings(),
      ])
      setStats(s); setUsers(u); setOrders(o); setListings(l)
    } catch (e) { showToast(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const approve = async (id, approved) => {
    try { await api.adminApproveUser(id, approved); showToast(approved ? 'B2B approved' : 'B2B rejected'); load() }
    catch (e) { showToast(e.message) }
  }
  const del = async (kind, id) => {
    if (!confirm('Delete this ' + kind + '?')) return
    try {
      if (kind === 'user') await api.adminDeleteUser(id)
      if (kind === 'order') await api.adminDeleteOrder(id)
      if (kind === 'listing') await api.adminDeleteListing(id)
      showToast('Deleted'); load()
    } catch (e) { showToast(e.message) }
  }

  const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

  return (
    <div className="min-h-screen bg-[#0c0f14] text-white">
      <Navbar />
      {toast && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[999] bg-emerald-600 px-5 py-3 rounded-full shadow-xl text-sm">{toast}</div>}

      <div className="max-w-6xl mx-auto px-5 py-10">
        <PageHeader eyebrow={t('Control Center')} title={t('Admin Panel')} subtitle={t('Manage users, listings, orders and B2B approvals.')} />

        <div className="flex gap-2 mb-7 flex-wrap">
          {[['stats', 'Dashboard'], ['users', 'Users'], ['listings', 'Listings'], ['orders', 'Orders']].map(([k, lbl]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${tab === k ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
              {lbl}
            </button>
          ))}
          <button onClick={load} className="ml-auto flex items-center gap-1.5 text-sm text-white/50 hover:text-white"><RefreshCw size={14} /> {t('Refresh')}</button>
        </div>

        {loading && <p className="text-white/40 text-center py-10">{t('Loading...')}</p>}

        {!loading && tab === 'stats' && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-5 bg-white/5 border-white/10"><p className="text-xs text-white/40">{t('Total Orders')}</p><p className="text-2xl font-extrabold">{stats.total_orders}</p></Card>
            <Card className="p-5 bg-white/5 border-white/10"><p className="text-xs text-white/40">{t('Revenue')}</p><p className="text-2xl font-extrabold text-emerald-400">{inr(stats.revenue)}</p></Card>
            <Card className="p-5 bg-white/5 border-white/10"><p className="text-xs text-white/40">{t('Active Listings')}</p><p className="text-2xl font-extrabold">{stats.active_listings}</p></Card>
            <Card className="p-5 bg-white/5 border-white/10"><p className="text-xs text-white/40">{t('Pending B2B')}</p><p className="text-2xl font-extrabold text-amber-400">{stats.pending_b2b}</p></Card>
          </div>
        )}

        {!loading && tab === 'users' && (
          <Card className="p-6 bg-white/5 border-white/10 overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead><tr className="text-left text-white/40 border-b border-white/10">
                <th className="pb-3">Name</th><th>Role</th><th>Business</th><th>GST</th><th>B2B</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-white/5">
                    <td className="py-2.5">{u.name}<div className="text-xs text-white/40">{u.email}</div></td>
                    <td><span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">{u.role}</span></td>
                    <td>{u.business_name || '-'}</td>
                    <td>{u.gst || '-'}</td>
                    <td>{u.role === 'b2b' ? (u.b2b_approved ? <span className="text-emerald-400 text-xs">✓ Approved</span> : <span className="text-amber-400 text-xs">Pending</span>) : '-'}</td>
                    <td className="flex gap-2 py-2.5">
                      {u.role === 'b2b' && !u.b2b_approved && (
                        <Button variant="primary" icon={CheckCircle2} onClick={() => approve(u.id, true)} className="px-3 py-1.5 text-xs">{t('Approve')}</Button>
                      )}
                      {u.role === 'b2b' && u.b2b_approved && (
                        <Button variant="outline" icon={XCircle} onClick={() => approve(u.id, false)} className="px-3 py-1.5 text-xs text-xs">{t('Revoke')}</Button>
                      )}
                      <button onClick={() => del('user', u.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {!loading && tab === 'listings' && (
          <Card className="p-6 bg-white/5 border-white/10 overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead><tr className="text-left text-white/40 border-b border-white/10"><th className="pb-3">Crop</th><th>Qty</th><th>Price</th><th>Seller</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {listings.map((l) => (
                  <tr key={l.id} className="border-b border-white/5">
                    <td className="py-2.5">{l.crop}</td>
                    <td>{l.qty} {l.unit}</td>
                    <td>{inr(l.price)}</td>
                    <td className="text-white/60">{l.seller}</td>
                    <td><span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">{l.status}</span></td>
                    <td><button onClick={() => del('listing', l.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"><Trash2 size={15} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {!loading && tab === 'orders' && (
          <Card className="p-6 bg-white/5 border-white/10 overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead><tr className="text-left text-white/40 border-b border-white/10"><th className="pb-3">ID</th><th>Crop</th><th>Amt</th><th>Status</th><th>Buyer</th><th></th></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-white/5">
                    <td className="py-2.5">#{o.id}</td>
                    <td>{o.crop}</td>
                    <td>{inr(Number(o.amount) + Number(o.gst || 0))}</td>
                    <td><span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">{o.status}</span></td>
                    <td className="text-white/60">{o.buyer_name || o.buyer_type}</td>
                    <td><button onClick={() => del('order', o.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"><Trash2 size={15} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  )
}
