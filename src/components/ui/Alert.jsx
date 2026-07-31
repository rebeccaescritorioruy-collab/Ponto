const TONES = {
  error: "border-red-200 bg-red-50 text-red-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
}

export default function Alert({ tone = "error", children }) {
  return <div className={`rounded-lg border px-4 py-3 text-sm ${TONES[tone]}`}>{children}</div>
}
