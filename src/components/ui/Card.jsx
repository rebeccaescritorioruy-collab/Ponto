export default function Card({ className = "", children }) {
  return (
    <div className={`rounded-2xl border border-neutral-300 bg-white p-6 shadow-xl shadow-neutral-900/15 ${className}`}>
      {children}
    </div>
  )
}
