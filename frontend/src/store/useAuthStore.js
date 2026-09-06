import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../lib/api'

// Real auth backed by the API. Token + user persisted so refresh keeps you logged in.
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      loading: false,
      error: '',

      login: async (email, password) => {
        set({ loading: true, error: '' })
        try {
          const { token, user } = await api.login(email, password)
          set({ token, user, loading: false })
          return user
        } catch (e) {
          set({ error: e.message, loading: false })
          throw e
        }
      },

      register: async (payload) => {
        set({ loading: true, error: '' })
        try {
          const { token, user } = await api.register(payload)
          set({ token, user, loading: false })
          return user
        } catch (e) {
          set({ error: e.message, loading: false })
          throw e
        }
      },

      logout: () => set({ user: null, token: null, error: '' }),
      clearError: () => set({ error: '' }),
    }),
    { name: 'krishisetu-auth' }
  )
)
