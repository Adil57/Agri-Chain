import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCartStore = create(
  persist(
    (set) => ({
      items: [],

      addItem: (product) =>
        set((state) => {
          const existing = state.items.find((i) => i.name === product.name)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.name === product.name ? { ...i, qty: i.qty + 1 } : i
              ),
            }
          }
          return { items: [...state.items, { ...product, qty: 1 }] }
        }),

      incQty: (name) =>
        set((state) => ({
          items: state.items.map((i) => (i.name === name ? { ...i, qty: i.qty + 1 } : i)),
        })),

      decQty: (name) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.name === name ? { ...i, qty: Math.max(1, i.qty - 1) } : i
          ),
        })),

      removeItem: (name) =>
        set((state) => ({ items: state.items.filter((i) => i.name !== name) })),

      clearCart: () => set({ items: [] }),
    }),
    { name: 'krishisetu-cart' }
  )
)