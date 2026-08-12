const TONES = {
  success: "bg-emerald-600 text-white",
  error: "bg-red-600 text-white",
}

/** Notificação flutuante que fica visível independente da posição de rolagem da página —
    diferente do Alert (que só aparece se o usuário estiver perto do topo). */
export default function Toast({ message, tone = "success" }) {
  if (!message) return null
  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className={`rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${TONES[tone]}`}>
        {message}
      </div>
    </div>
  )
}
