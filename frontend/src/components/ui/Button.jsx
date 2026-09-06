import { motion } from 'framer-motion'

export default function Button({ children, variant = 'primary', className = '', onClick, icon: Icon }) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all duration-200 px-5 py-2.5 text-sm'

  const variants = {
    primary: 'bg-[#f5a524] text-[#1a2e0a] hover:bg-[#e6941a] shadow-md shadow-amber-900/10',
    dark: 'bg-[#16240a] text-white hover:bg-[#213610]',
    outline: 'border border-[#1a2e0a]/25 text-[#1a2e0a] hover:bg-[#1a2e0a]/[0.04]',
    ghost: 'text-[#1a2e0a]/70 hover:bg-black/[0.04]',
  }

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {Icon && <Icon size={16} strokeWidth={2.2} />}
      {children}
    </motion.button>
  )
}