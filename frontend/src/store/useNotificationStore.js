import { create } from 'zustand'
import api from '../lib/api'
import { useT } from '../i18n/index.jsx'

// Server-backed notifications (per logged-in user).
export const useNotificationStore = create((set) => ({
  notifications: [],
  loading: false,

  fetchNotifications: async () => {
    set({ loading: true })
    try {
      const notifications = await api.getNotifications()
      // normalise: backend uses created_at, UI expects a `time` label
      const mapped = notifications.map((n) => ({
        id: n.id,
        text: n.text,
        time: n.created_at,
        read: n.read,
        role: n.role,
      }))
      set({ notifications: mapped, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  // Returns the new unread count so the badge can update immediately.
  markAllRead: async () => {
    try {
      const res = await api.markRead()
      if (res?.notifications) {
        const mapped = res.notifications.map((n) => ({
          id: n.id,
          text: n.text,
          time: n.created_at,
          read: n.read,
          role: n.role,
        }))
        set({ notifications: mapped })
        return mapped.filter((n) => !n.read).length
      }
      // Fallback: just mark locally if server didn't return list
      set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: 1 })) }))
    } catch {
      /* non-critical */
    }
    return 0
  },
}))
