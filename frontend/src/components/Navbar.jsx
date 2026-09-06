import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Sprout, Store, ShoppingBasket, BrainCircuit, Menu, Bell, ChevronDown, LogOut, Receipt } from 'lucide-react'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotificationStore } from '../store/useNotificationStore'
import { useAuthStore } from '../store/useAuthStore'
import LanguageSwitcher from './LanguageSwitcher'
import { useT } from '../i18n/index.jsx'

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const t = useT()
  const [open, setOpen] = useState(false)
  const [roleOpen, setRoleOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const { notifications, fetchNotifications, markAllRead } = useNotificationStore()
  const { user, logout } = useAuthStore()

  // Poll notifications so farmer sees buyer activity in near-real-time.
  useEffect(() => {
    if (!user) return
    fetchNotifications()
    const t = setInterval(fetchNotifications, 5000)
    return () => clearInterval(t)
  }, [user, fetchNotifications])

  const allLinks = [
    { path: '/farmer', label: t('Farmer'), icon: Sprout, roles: ['farmer'] },
    { path: '/b2b', label: t('B2B Portal'), icon: Store, roles: ['b2b'] },
    { path: '/b2c', label: t('B2C Store'), icon: ShoppingBasket, roles: ['b2c'] },
    { path: '/ai', label: t('AI Engine'), icon: BrainCircuit, roles: ['farmer', 'b2b', 'b2c'] },
    { path: '/orders', label: t('Orders'), icon: Receipt, roles: ['farmer', 'b2b', 'b2c'] },
  ]

  // Filter links based on logged-in user's role
  const links = user
    ? allLinks.filter((l) => l.roles.includes(user.role))
    : allLinks

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const openNotif = () => {
    setNotifOpen((v) => !v)
    setRoleOpen(false)
    if (!notifOpen) markAllRead()
  }

  return (
    <nav className="sticky top-0 z-50 bg-[#16240a]/95 backdrop-blur-md text-white border-b border-white/5">
      <div className="max-w-6xl mx-auto px-5 py-3.5 flex items-center justify-between gap-3">
        <Link to="/" className="text-lg font-extrabold tracking-tight shrink-0">
          Agri<span className="text-amber-400">Chain</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => {
            const active = location.pathname === l.path
            return (
              <Link key={l.path} to={l.path}
                className={`relative flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-full transition-colors ${
                  active ? 'text-[#16240a] font-semibold' : 'text-white/70 hover:text-white'
                }`}>
                {active && (
                  <motion.div layoutId="navpill" className="absolute inset-0 bg-amber-400 rounded-full"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }} />
                )}
                <l.icon size={15} className="relative z-10" strokeWidth={2.2} />
                <span className="relative z-10">{l.label}</span>
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher dark />
          <div className="relative">
            <button onClick={openNotif} className="relative p-2 rounded-full hover:bg-white/10">
              <Bell size={18} />
              {notifications.some((n) => !n.read) && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold">
                  {notifications.filter((n) => !n.read).length > 9 ? '9+' : notifications.filter((n) => !n.read).length}
                </span>
              )}
            </button>
            <AnimatePresence>
              {notifOpen && (
                <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  className="absolute right-0 mt-2 w-72 max-h-80 overflow-y-auto bg-white rounded-2xl shadow-xl border border-black/5 p-2 text-[#16240a]">
                  <p className="text-xs font-bold text-black/40 uppercase px-3 py-2 sticky top-0 bg-white">{t('Notifications')}</p>
                  {notifications.length === 0 && <p className="text-sm text-black/40 px-3 py-4 text-center">{t('No notifications yet')}</p>}
                  {notifications.map((n) => (
                    <div key={n.id} className={`px-3 py-2.5 rounded-xl hover:bg-black/[0.03] ${n.read ? 'opacity-60' : ''}`}>
                      <p className="text-sm">{t(n.text)}</p>
                      <p className="text-xs text-black/35 mt-0.5">{n.time}</p>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {user ? (
            <div className="relative hidden sm:block">
              <button onClick={() => { setRoleOpen(!roleOpen); setNotifOpen(false) }}
                className="flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full px-3.5 py-1.5 text-xs font-medium">
                {user.name} <ChevronDown size={13} />
              </button>
              <AnimatePresence>
                {roleOpen && (
                  <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-black/5 p-2 text-[#16240a]">
                    <div className="px-3 py-2 border-b border-black/5 mb-1">
                      <p className="text-xs text-black/40">{t('Logged in as')}</p>
                      <p className="text-sm font-bold capitalize">{user.role}</p>
                    </div>
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 text-left px-3 py-2.5 rounded-xl hover:bg-red-50 text-sm font-medium text-red-600">
                      <LogOut size={14} /> {t('Logout')}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button onClick={() => navigate('/login')} className="hidden sm:block bg-amber-400 text-[#16240a] rounded-full px-4 py-1.5 text-xs font-bold hover:bg-amber-300">
              {t('Login')}
            </button>
          )}

          <button onClick={() => setOpen(!open)} className="md:hidden p-1.5">
            <Menu size={22} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-t border-white/10">
            <div className="flex flex-col p-3 gap-1">
              {links.map((l) => (
                <Link key={l.path} to={l.path} onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm ${
                    location.pathname === l.path ? 'bg-amber-400 text-[#16240a] font-semibold' : 'text-white/80'
                  }`}>
                  <l.icon size={16} />{l.label}
                </Link>
              ))}
              {user ? (
                <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-red-300">
                  <LogOut size={16} /> {t('Logout')}
                </button>
              ) : (
                <button onClick={() => { navigate('/login'); setOpen(false) }} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm bg-amber-400 text-[#16240a] font-semibold">
                  {t('Login')}
                </button>
              )}
              <div className="px-3 py-2"><LanguageSwitcher dark={false} /></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
