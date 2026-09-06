import { create } from 'zustand'
import api from '../lib/api'

// Server-backed listings. No more localStorage — everything comes from the DB
// so farmer listings are visible to B2B/B2C buyers in real time.
export const useListingsStore = create((set, get) => ({
  listings: [],
  loading: false,
  error: '',

  fetchListings: async () => {
    set({ loading: true, error: '' })
    try {
      const listings = await api.getListings()
      set({ listings, loading: false })
    } catch (e) {
      set({ error: e.message, loading: false })
    }
  },

  addListing: async (payload) => {
    const created = await api.createListing(payload)
    set((s) => ({ listings: [created, ...s.listings] }))
    return created
  },

  deleteListing: async (id) => {
    await api.deleteListing(id)
    set((s) => ({ listings: s.listings.filter((l) => l.id !== id) }))
  },

  addBid: async (id) => {
    const updated = await api.bid(id)
    set((s) => ({ listings: s.listings.map((l) => (l.id === id ? updated : l)) }))
    return updated
  },

  buyBulk: async (id, qty, address) => {
    const { listing } = await api.buyBulk(id, qty, address)
    set((s) => ({ listings: s.listings.map((l) => (l.id === id ? listing : l)) }))
    return listing
  },
}))
