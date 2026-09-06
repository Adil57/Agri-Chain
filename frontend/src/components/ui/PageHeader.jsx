import { motion } from 'framer-motion'

export default function PageHeader({ eyebrow, title, subtitle }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-8"
    >
      {eyebrow && (
        <p className="text-xs font-bold tracking-widest text-amber-600 uppercase mb-2">
          {eyebrow}
        </p>
      )}
      <h1 className="text-3xl md:text-4xl font-extrabold text-[#16240a] tracking-tight">
        {title}
      </h1>
      {subtitle && <p className="text-black/50 mt-2 text-[15px]">{subtitle}</p>}
    </motion.div>
  )
}