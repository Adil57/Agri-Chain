import { motion } from 'framer-motion'

export default function Card({ children, className = '', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className={`bg-white rounded-3xl border border-black/[0.06] shadow-[0_2px_20px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.12)] transition-shadow duration-300 flex flex-col ${className}`}
    >
      {children}
    </motion.div>
  )
}