export default function AdminTabs({ tabs, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-3">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            active === t.key
              ? "bg-brand-600 text-white"
              : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
