export default function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-black/[0.05] text-black/60',
    green: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10',
    amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/10',
    blue: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/10',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  )
}