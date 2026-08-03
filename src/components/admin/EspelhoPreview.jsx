
import { computeEspelhoRows } from "../../lib/export"
import { minutesToClock, minutesToHHMM } from "../../lib/calculo"

export default function EspelhoPreview({
  employee: emp, empresa, periodoCurto, summaries,
  totalWorked, totalPositivas, totalNegativas,
}) {
  const rows = computeEspelhoRows(summaries)

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200">
      <table className="w-full min-w-[900px] border-collapse text-left text-xs">
        <tbody>
          <PreviewInfoRow label="Empregador" value={empresa.nome || ""} />
          <PreviewInfoRow label="CNPJ/CEI" value={empresa.cnpj || ""} />
          <PreviewInfoRow label="Trabalhador" value={`${emp.nome}${emp.matricula ? ` — Matrícula ${emp.matricula}` : ""}`} />
          <PreviewInfoRow label="Cargo / Lotação" value={`${emp.cargo || ""}${emp.lotacao ? ` — ${emp.lotacao}` : ""}`} />
          <PreviewInfoRow label="CTPS" value={emp.ctps || ""} />
          <PreviewInfoRow label="Período" value={periodoCurto} />
        </tbody>
        <thead>
          <tr className="bg-ink-700 text-white">
            {["Data", "Dia da semana", "Entrada", "Saída intervalo", "Retorno intervalo", "Saída", "Horas trabalhadas", "Horas positivas", "Horas negativas", "Observação / Justificativa / Assinatura"].map((h) => (
              <th key={h} className="border border-neutral-300 px-2 py-2 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.dayKey} className={r.muted ? "italic text-neutral-400" : "text-neutral-800"}>
              <td className="border border-neutral-200 px-2 py-1">{r.dataFmt}</td>
              <td className="border border-neutral-200 px-2 py-1">{r.diaSemana}</td>
              <td className="border border-neutral-200 px-2 py-1">{r.entrada}</td>
              <td className="border border-neutral-200 px-2 py-1">{r.saidaIntervalo}</td>
              <td className="border border-neutral-200 px-2 py-1">{r.retornoIntervalo}</td>
              <td className="border border-neutral-200 px-2 py-1">{r.saida}</td>
              <td className="border border-neutral-200 px-2 py-1">{r.horasTrabalhadas}</td>
              <td className="border border-neutral-200 px-2 py-1">{r.horasPositivas}</td>
              <td className="border border-neutral-200 px-2 py-1">{r.horasNegativas}</td>
              <td className="border border-neutral-200 px-2 py-1">{r.observacao}</td>
            </tr>
          ))}
        </tbody>
        <tbody>
          <tr>
            <td colSpan={10} className="border border-neutral-300 bg-ink-700 px-2 py-1.5 text-center font-semibold text-white">
              TOTAIS DO PERÍODO — {periodoCurto}
            </td>
          </tr>
          <PreviewTotalRow label="Total trabalhado (bruto)" value={minutesToClock(totalWorked)} />
          <PreviewTotalRow label="Total de horas positivas" value={minutesToClock(totalPositivas)} />
          <PreviewTotalRow label="Total de horas negativas" value={minutesToClock(totalNegativas)} />
          <PreviewTotalRow label="Saldo líquido do período (positivas − negativas)" value={minutesToHHMM(totalPositivas - totalNegativas)} />
          <tr>
            <td colSpan={10} className="px-2 pt-6 pb-1">
              <div className="w-64 border-b border-ink-700" />
              <p className="mt-1 text-neutral-500">Assinatura de {emp.nome}</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function PreviewInfoRow({ label, value }) {
  return (
    <tr>
      <td className="w-40 whitespace-nowrap px-2 py-1 font-semibold text-neutral-800">{label}</td>
      <td colSpan={9} className="px-2 py-1 text-neutral-700">{value}</td>
    </tr>
  )
}

function PreviewTotalRow({ label, value }) {
  return (
    <tr className="bg-brand-100 font-semibold text-neutral-800">
      <td colSpan={6} className="border border-neutral-300 px-2 py-1">{label}</td>
      <td className="border border-neutral-300 px-2 py-1 text-right">{value}</td>
      <td colSpan={3} className="border border-neutral-300 px-2 py-1" />
    </tr>
  )
}
