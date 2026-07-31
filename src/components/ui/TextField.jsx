export default function TextField({ label, className = "", ...props }) {
  return (
    <label className={`block text-sm ${className}`}>
      {label && <span className="mb-1 block font-medium text-neutral-700">{label}</span>}
      <input
        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:bg-neutral-100 disabled:text-neutral-500"
        {...props}
      />
    </label>
  )
}
