import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Shield, Users, ShoppingBag, Package, CheckCircle2, XCircle, Trash2, RefreshCw, Lock } from 'lucide-react'
import Navbar from '../components/Navbar'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import PageHeader from '../components/ui/PageHeader'
import api from '../lib/api'
import { useT } from '../i18n/index.jsx'

const ADMIN_TOKEN_KEY = 'krishisetu-admin'

export default function AdminPanel() {
  const t = useT()
  const [tab, setTab] = useState('stats')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [orders, setOrders] = useState([])
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [authed, setAuthed] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginErr, setLoginErr] = useState('')

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2500) }

  useEffect(() => {
    const tk = localStorage.getItem(ADMIN_TOKEN_KEY)
    if (tk) { api.setAdminToken(tk); setAuthed(true) }
  }, [])

  const doLogin = async () => {
    try {
      const { token } = await api.adminLogin(email, password)
      localStorage.setItem(ADMIN_TOKEN_KEY, token)
      api.setAdminToken(token)
      setAuthed(true)
      setLoginErr('')
    } catch (e) { setLoginErr(e.message || 'Login failed') }
  }

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

  useEffect(() => { if (authed) load() }, [authed, load])

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
  const pendingB2B = users.filter((u) => u.role === 'b2b' && !u.b2b_approved)

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0c0f14] text-white flex items-center justify-center px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="w-full max-w-sm bg-white/5 border border-white/10 rounded-3xl p-7">
          <div className="text-center mb-6">
            <Shield size={36} className="mx-auto text-amber-400 mb-2" />
            <h1 className="text-xl font-extrabold text-white">Admin Login</h1>
            <p className="text-xs text-white/50 mt-1">AgriChain Control Center</p>
          </div>
          <div className="space-y-3">
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@agrichain"
              className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
            <div className="relative">
              <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
                onKeyDown={(e) => e.key === 'Enter' && doLogin()}
                className="w-full bg-white/10 border border-white/15 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
            </div>
            {loginErr && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{loginErr}</p>}
            <Button variant="primary" className="w-full justify-center py-3" onClick={doLogin}>Login</Button>
          </div>
          <p className="text-center text-[11px] text-white/30 mt-4">Demo: admin@agrichain / Adil123</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0c0f14] text-white">
      <Navbar />
      {toast && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[999] bg-emerald-600 px-5 py-3 rounded-full shadow-xl text-sm text-white">{toast}</div>}

      <div className="max-w-6xl mx-auto px-5 py-10">
        <PageHeader eyebrow={<span className="text-white/60">Control Center</span>} title={<span className="text-white">Admin Panel</span>} subtitle={<span className="text-white/50">Manage users, listings, orders and B2B approvals.</span>} />

        <div className="flex gap-2 mb-7 flex-wrap">
          {[['stats', 'Dashboard'], ['pending', `Pending B2B (${pendingB2B.length})`], ['users', 'Users'], ['listings', 'Listings'], ['orders', 'Orders']].map(([k, lbl]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${tab === k ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
              {lbl}
            </button>
          ))}
          <button onClick={load} className="ml-auto flex items-center gap-1.5 text-sm text-white/50 hover:text-white"><RefreshCw size={14} /> {t('Refresh')}</button>
          <button onClick={() => { localStorage.removeItem(ADMIN_TOKEN_KEY); api.setAdminToken(null); setAuthed(false) }}
            className="flex items-center gap-1.5 text-sm text-white/40 hover:text-red-400">Logout</button>
        </div>

        {loading && <p className="text-white/40 text-center py-10">{t('Loading...')}</p>}

        {!loading && tab === 'stats' && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-5 bg-white/5 border-white/10"><p className="text-xs text-white/40">Total Orders</p><p className="text-2xl font-extrabold text-white">{stats.total_orders}</p></Card>
            <Card className="p-5 bg-white/5 border-white/10"><p className="text-xs text-white/40">Revenue</p><p className="text-2xl font-extrabold text-emerald-400">{inr(stats.revenue)}</p></Card>
            <Card className="p-5 bg-white/5 border-white/10"><p className="text-xs text-white/40">Active Listings</p><p className="text-2xl font-extrabold text-white">{stats.active_listings}</p></Card>
            <Card className="p-5 bg-white/5 border-white/10"><p className="text-xs text-white/40">Pending B2B</p><p className="text-2xl font-extrabold text-amber-400">{stats.pending_b2b}</p></Card>
          </div>
        )}

        {!loading && tab === 'pending' && (
          <Card className="p-6 bg-white/5 border-white/10 overflow-x-auto">
            <h2 className="text-lg font-bold text-white mb-4">Pending B2B Approvals ({pendingB2B.length})</h2>
            {pendingB2B.length === 0 ? (
              <p className="text-white/40 text-sm">No pending B2B accounts 🎉</p>
            ) : (
              <table className="w-full text-sm min-w-[600px]">
                <thead><tr className="text-left text-white/40 border-b border-white/10">
                  <th className="pb-3">Name</th><th>Business</th><th>GST</th><th>Contact</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {pendingB2B.map((u) => (
                    <tr key={u.id} className="border-b border-white/5">
                      <td className="py-2.5 text-white">{u.name}<div className="text-xs text-white/40">{u.email}</div></td>
                      <td className="text-white/70">{u.business_name || '-'}</td>
                      <td className="text-white/70">{u.gst || '-'}</td>
                      <td className="text-white/70">{u.contact || '-'}</td>
                      <td className="flex gap-2 py-2.5">
                        <Button variant="primary" icon={CheckCircle2} onClick={() => approve(u.id, true)} className="px-3 py-1.5 text-xs">Approve</Button>
                        <button onClick={() => del('user', u.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
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
                    <td className="py-2.5 text-white">{u.name}<div className="text-xs text-white/40">{u.email}</div></td>
                    <td><span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-white/70">{u.role}</span></td>
                    <td className="text-white/70">{u.business_name || '-'}</td>
                    <td className="text-white/70">{u.gst || '-'}</td>
                    <td>{u.role === 'b2b' ? (u.b2b_approved ? <span className="text-emerald-400 text-xs">✓ Approved</span> : <span className="text-amber-400 text-xs">Pending</span>) : '-'}</td>
                    <td className="flex gap-2 py-2.5">
                      {u.role === 'b2b' && !u.b2b_approved && (
                        <Button variant="primary" icon={CheckCircle2} onClick={() => approve(u.id, true)} className="px-3 py-1.5 text-xs">Approve</Button>
                      )}
                      {u.role === 'b2b' && u.b2b_approved && (
                        <Button variant="outline" icon={XCircle} onClick={() => approve(u.id, false)} className="px-3 py-1.5 text-xs text-xs">Revoke</Button>
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
                    <td className="py-2.5 text-white">{l.crop}</td>
                    <td className="text-white/70">{l.qty} {l.unit}</td>
                    <td className="text-white/70">{inr(l.price)}</td>
                    <td className="text-white/60">{l.seller}</td>
                    <td><span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-white/70">{l.status}</span></td>
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
                    <td className="py-2.5 text-white">#{o.id}</td>
                    <td className="text-white">{o.crop}</td>
                    <td className="text-white/70">{inr(Number(o.amount) + Number(o.gst || 0))}</td>
                    <td><span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-white/70">{o.status}</span></td>
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
