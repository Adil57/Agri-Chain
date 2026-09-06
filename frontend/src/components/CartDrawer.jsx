import { AnimatePresence, motion } from 'framer-motion'
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import Button from './ui/Button'
import { useCartStore } from '../store/useCartStore'
import { useT } from '../i18n/index.jsx'

export default function CartDrawer({ open, onClose, onCheckout }) {
  const t = useT()
  const { items, incQty, decQty, removeItem } = useCartStore()
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-[998]"
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-[#fdfaf3] z-[999] shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-black/10">
              <h3 className="flex items-center gap-2 font-extrabold text-[#16240a]"><ShoppingBag size={18} /> {t('Your Cart')}</h3>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/5"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {items.length === 0 && <p className="text-center text-black/40 mt-10">{t('Your cart is empty.')}</p>}
              {items.map((item) => (
                <div key={item.name} className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-black/5">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[#16240a] truncate">{item.name}</p>
                    <p className="text-xs text-black/40">₹{item.price}/{item.unit}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => decQty(item.name)} className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center"><Minus size={12} /></button>
                    <span className="text-sm font-bold w-4 text-center">{item.qty}</span>
                    <button onClick={() => incQty(item.name)} className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center"><Plus size={12} /></button>
                  </div>
                  <button onClick={() => removeItem(item.name)} className="text-red-500 p-1"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>

            {items.length > 0 && (
              <div className="p-5 border-t border-black/10">
                <div className="flex justify-between mb-4 text-sm">
                  <span className="text-black/50">{t('Total')}</span>
                  <span className="font-extrabold text-lg text-[#16240a]">₹{total}</span>
                </div>
                <Button variant="primary" className="w-full py-3" onClick={onCheckout}>{t('Place Order')}</Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}