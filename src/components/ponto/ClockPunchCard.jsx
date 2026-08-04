import { useEffect, useState } from "react"
import Card from "../ui/Card"
import Button from "../ui/Button"
import { formatClock, formatDateHeader, formatTime, punchTypesForEmployee } from "../../lib/calculo"

const PUNCH_COLORS = {
  "Entrada": "bg-emerald-500",
  "Início do intervalo": "bg-amber-500",
  "Fim do intervalo": "bg-sky-500",
  "Saída": "bg-rose-500",
}

export default function ClockPunchCard({ employee, punches, onPunch, stamping, onToggleChangePassword }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const tipos = punchTypesForEmployee(employee)
  const nextType = tipos[punches.length % tipos.length]

  return (
    <Card>
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-sm text-neutral-500">{formatDateHeader(now)}</p>
        <p className="font-mono text-4xl font-semibold tabular-nums text-neutral-900">
          {formatClock(now)}
        </p>
      </div>

      <div className="mt-6 flex flex-col items-center gap-2">
        <p className="text-sm text-neutral-600">
          Olá, <span className="font-medium text-neutral-900">{employee.nome}</span>
        </p>
        <button
          onClick={onToggleChangePassword}
          className="text-xs text-brand-600 hover:underline"
        >
          Trocar senha
        </button>
        <Button onClick={onPunch} disabled={stamping} className="mt-2 px-8 py-3 text-base">
          {stamping ? "Registrando…" : `Bater ponto · ${nextType}`}
        </Button>
      </div>

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-neutral-700">Marcações de hoje</h3>
        {punches.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhuma marcação ainda.</p>
        ) : (
          <ul>
            {punches.map((p, i) => (
              <li key={p.id} className="relative flex items-center gap-3 pb-4 last:pb-0">
                {i < punches.length - 1 && (
                  <span className="absolute left-[7px] top-4 h-full w-px bg-neutral-200" />
                )}
                <span
                  className={`relative z-10 h-3.5 w-3.5 flex-none rounded-full ring-4 ring-white ${PUNCH_COLORS[p.type] || "bg-neutral-400"}`}
                />
                <span className="flex-1 text-sm text-neutral-700">{p.type}</span>
                <span className="font-mono text-sm text-neutral-900">{formatTime(p.time)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}
