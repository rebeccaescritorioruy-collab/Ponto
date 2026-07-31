import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useEmployees } from "../../hooks/useEmployees"
import { useEmployers } from "../../hooks/useEmployers"
import {
  todayKey, weekRangeOf, monthRangeOf, buildDaySummary, empresaDoVinculo,
  minutesToHHMM, monthLabelPt, weekdayAbbrev, formatTimeShort,
} from "../../lib/calculo"
import { exportEspelhoCSV, exportEspelhoXLSX } from "../../lib/export"
import Card from "../ui/Card"
import Select from "../ui/Select"
import TextField from "../ui/TextField"
import Button from "../ui/Button"
import Alert from "../ui/Alert"

function mapTreatmentRow(row) {
  return {
    kind: row.kind,
    motivoCategoria: row.motivo_categoria,
    motivo: row.motivo,
    tipoMarcacao: row.tipo_marcacao,
    horario: row.horario,
  }
}

export default function EspelhoTab() {
  const { employees } = useEmployees()
  const { employers } = useEmployers()

  const [cpf, setCpf] = useState("")
  const [reportTipo, setReportTipo] = useState("mensal")
  const [month, setMonth] = useState(todayKey().slice(0, 7))
  const [semanaRef, setSemanaRef] = useState(todayKey())
  // Guarda o resultado junto da chave (cpf+período) que o originou — permite derivar
  // "loading"/"dados atuais" sem precisar de um setState síncrono dentro do efeito de busca.
  const [periodData, setPeriodData] = useState({ key: "", punches: [], treatmentsByDay: {} })
  const [error, setError] = useState(null)

  const employee = employees.find((e) => e.cpf === cpf)
  const periodRange = useMemo(
    () => (reportTipo === "semanal" ? weekRangeOf(semanaRef) : monthRangeOf(month)),
    [reportTipo, semanaRef, month]
  )
  const periodKey = cpf ? `${cpf}:${periodRange.start}:${periodRange.end}` : ""

  useEffect(() => {
    if (!cpf) return
    let cancelled = false
    const { start, end } = periodRange
    Promise.all([
      supabase.from("punches").select("*").eq("cpf", cpf)
        .gte("time", `${start}T00:00:00`).lte("time", `${end}T23:59:59`).order("time"),
      supabase.from("treatments").select("*").eq("cpf", cpf)
        .gte("date", start).lte("date", end),
    ]).then(([{ data: punchRows, error: pErr }, { data: treatRows, error: tErr }]) => {
      if (cancelled) return
      if (pErr || tErr) {
        setError((pErr || tErr).message)
        return
      }
      const treatmentsByDay = {}
      ;(treatRows || []).forEach((row) => {
        treatmentsByDay[row.date] = [...(treatmentsByDay[row.date] || []), mapTreatmentRow(row)]
      })
      setPeriodData({ key: periodKey, punches: punchRows || [], treatmentsByDay })
      setError(null)
    })
    return () => { cancelled = true }
  }, [cpf, periodRange, periodKey])

  const loading = Boolean(cpf) && periodData.key !== periodKey
  const punches = useMemo(
    () => (periodData.key === periodKey ? periodData.punches : []),
    [periodData, periodKey]
  )
  const treatmentsByDay = useMemo(
    () => (periodData.key === periodKey ? periodData.treatmentsByDay : {}),
    [periodData, periodKey]
  )

  const byDay = useMemo(() => {
    const map = {}
    const { start, end } = periodRange
    const cursor = new Date(`${start}T00:00:00`)
    const endDate = new Date(`${end}T00:00:00`)
    while (cursor <= endDate) {
      map[todayKey(cursor)] = []
      cursor.setDate(cursor.getDate() + 1)
    }
    punches.forEach((p) => {
      const dk = todayKey(new Date(p.time))
      if (!map[dk]) map[dk] = []
      map[dk].push(p)
    })
    return map
  }, [punches, periodRange])

  const summaries = useMemo(() => {
    if (!employee) return {}
    const out = {}
    Object.keys(byDay).forEach((day) => {
      out[day] = buildDaySummary(day, byDay[day], treatmentsByDay[day] || [], employee)
    })
    return out
  }, [byDay, treatmentsByDay, employee])

  const periodTargetMinutes = useMemo(() => {
    if (!employee) return 0
    if (reportTipo === "mensal") return (Number(employee.jornadaMensalHoras) || 0) * 60
    return (Number(employee.horasDiarias) || 0) * 5 * 60
  }, [employee, reportTipo])

  const totalWorked = useMemo(() => Object.values(summaries).reduce((acc, s) => acc + s.minutes, 0), [summaries])
  const totalBalance = totalWorked - periodTargetMinutes
  const totalPositivas = totalBalance > 0 ? totalBalance : 0
  const totalNegativas = totalBalance < 0 ? -totalBalance : 0
  const diasSemRegistro = useMemo(
    () => Object.keys(summaries).filter((d) => summaries[d].semRegistro && summaries[d].status !== "abonado").sort(),
    [summaries]
  )

  function exportParams() {
    return {
      employee, empresa: empresaDoVinculo(employers, employee.vinculo), reportTipo, periodRange,
      espelhoMonth: month, summaries, periodTargetMinutes, totalWorked, totalPositivas, totalNegativas, diasSemRegistro,
    }
  }

  return (
    <div className="space-y-6">
      {error && <Alert tone="error">{error}</Alert>}

      <Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Select label="Funcionário" value={cpf} onChange={(e) => setCpf(e.target.value)} className="sm:col-span-2">
            <option value="">Selecione</option>
            {employees.map((e) => <option key={e.cpf} value={e.cpf}>{e.nome}</option>)}
          </Select>
          <Select label="Período" value={reportTipo} onChange={(e) => setReportTipo(e.target.value)}>
            <option value="mensal">Mensal</option>
            <option value="semanal">Semanal</option>
          </Select>
          {reportTipo === "mensal" ? (
            <TextField label="Mês" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          ) : (
            <TextField label="Semana de" type="date" value={semanaRef} onChange={(e) => setSemanaRef(e.target.value)} />
          )}
        </div>
      </Card>

      {!cpf ? (
        <p className="text-sm text-neutral-500">Selecione um funcionário para ver o espelho de ponto.</p>
      ) : loading ? (
        <p className="text-sm text-neutral-500">Carregando…</p>
      ) : (
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-neutral-500">
                {reportTipo === "mensal" ? monthLabelPt(month) : `${periodRange.start} a ${periodRange.end}`}
              </p>
              <p className="text-lg font-semibold text-neutral-900">
                Saldo do período:{" "}
                <span className={totalBalance < 0 ? "text-red-600" : "text-emerald-600"}>
                  {minutesToHHMM(totalBalance)}
                </span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => exportEspelhoCSV(exportParams())}>Exportar CSV</Button>
              <Button variant="secondary" onClick={() => exportEspelhoXLSX(exportParams())}>Exportar XLSX</Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500">
                  <th className="py-2 pr-3 font-medium">Data</th>
                  <th className="py-2 pr-3 font-medium">Marcações</th>
                  <th className="py-2 pr-3 font-medium">Trabalhado</th>
                  <th className="py-2 pr-3 font-medium">Saldo</th>
                  <th className="py-2 pr-3 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {Object.keys(summaries).sort().map((day) => {
                  const s = summaries[day]
                  return (
                    <tr key={day}>
                      <td className="py-2 pr-3 text-neutral-900">
                        {weekdayAbbrev(day)} {day.slice(8, 10)}/{day.slice(5, 7)}
                      </td>
                      <td className="py-2 pr-3 text-neutral-600">
                        {s.status === "abonado" ? "—" : (s.merged.map((p) => formatTimeShort(p.time)).join(" · ") || "—")}
                      </td>
                      <td className="py-2 pr-3 text-neutral-600">
                        {s.status === "sem_registro" ? "—" : minutesToHHMM(s.minutes)}
                      </td>
                      <td className={`py-2 pr-3 font-medium ${s.balance < 0 ? "text-red-600" : s.balance > 0 ? "text-emerald-600" : "text-neutral-500"}`}>
                        {s.status === "sem_registro" ? "—" : minutesToHHMM(s.balance)}
                      </td>
                      <td className="py-2 pr-3">
                        {s.status === "abonado" && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Abonado</span>
                        )}
                        {s.status === "sem_registro" && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Sem registro</span>
                        )}
                        {s.status === "normal" && s.toleranciaAplicada && (
                          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">Tolerância aplicada</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {diasSemRegistro.length > 0 && (
            <p className="mt-4 text-xs text-amber-700">
              Dias sem nenhum registro (verificar se é folga/DSR ou falta não justificada): {diasSemRegistro.join(", ")}
            </p>
          )}
        </Card>
      )}
    </div>
  )
}
