import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useEmployees } from "../../hooks/useEmployees"
import { useEmployers } from "../../hooks/useEmployers"
import {
  todayKey, weekRangeOf, monthRangeOf, buildDaySummary, empresaDoVinculo,
  minutesToHHMM, monthLabelPt, weekdayAbbrev, formatTimeShort, isWeekend,
} from "../../lib/calculo"
import { exportEspelhoCSV, exportEspelhoXLSX } from "../../lib/export"
import Card from "../ui/Card"
import Select from "../ui/Select"
import TextField from "../ui/TextField"
import Button from "../ui/Button"
import Alert from "../ui/Alert"
import EspelhoPreview from "./EspelhoPreview"

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
  const [showPreview, setShowPreview] = useState(false)
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

  // Soma o saldo já ajustado (pós-tolerância) de cada dia — a tolerância do art. 58 §1º da
  // CLT vale por dia, então não dá pra derivar o saldo do período comparando só o total
  // bruto trabalhado contra a meta do período (isso perderia o perdão diário de cada dia
  // dentro da tolerância, e também misturaria dias positivos com negativos).
  const totalWorked = useMemo(() => Object.values(summaries).reduce((acc, s) => acc + s.minutes, 0), [summaries])
  const totalBalance = useMemo(() => Object.values(summaries).reduce((acc, s) => acc + s.balance, 0), [summaries])
  const totalPositivas = useMemo(
    () => Object.values(summaries).reduce((acc, s) => acc + (s.balance > 0 ? s.balance : 0), 0),
    [summaries]
  )
  const totalNegativas = useMemo(
    () => Object.values(summaries).reduce((acc, s) => acc + (s.balance < 0 ? -s.balance : 0), 0),
    [summaries]
  )
  // Só entram no alerta os dias úteis, já ocorridos, sem nenhum registro — fim de semana e
  // dias futuros têm explicação própria (folga e "ainda não ocorreu"), não precisam de alerta.
  const hoje = todayKey()
  const diasSemRegistro = useMemo(
    () => Object.keys(summaries).filter((d) => summaries[d].semRegistro && d <= hoje && !isWeekend(d)).sort(),
    [summaries, hoje]
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
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" onClick={() => setShowPreview((v) => !v)}>
                {showPreview ? "Ocultar prévia" : "Pré-visualizar planilha"}
              </Button>
              <Button onClick={() => exportEspelhoXLSX(exportParams())}>Baixar planilha (Excel)</Button>
              <button
                onClick={() => exportEspelhoCSV(exportParams())}
                className="text-xs text-neutral-500 underline hover:text-neutral-700"
              >
                exportar dados brutos em .csv
              </button>
            </div>
          </div>

          {showPreview && (
            <div className="mb-6">
              <p className="mb-2 text-xs text-neutral-500">
                Prévia de como a planilha (Excel) vai sair — não precisa baixar pra conferir.
              </p>
              <EspelhoPreview
                employee={employee}
                empresa={empresaDoVinculo(employers, employee.vinculo)}
                periodoCurto={`${periodRange.start} a ${periodRange.end}`}
                summaries={summaries}
                totalWorked={totalWorked}
                totalPositivas={totalPositivas}
                totalNegativas={totalNegativas}
              />
            </div>
          )}

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
                  const futuro = day > hoje
                  const semRegistroFimDeSemana = s.status === "sem_registro" && isWeekend(day) && !futuro
                  const semHoras = s.status === "sem_registro" || s.status === "incompleto" || futuro
                  return (
                    <tr key={day}>
                      <td className="py-2 pr-3 text-neutral-900">
                        {weekdayAbbrev(day)} {day.slice(8, 10)}/{day.slice(5, 7)}
                      </td>
                      <td className="py-2 pr-3 text-neutral-600">
                        {s.status === "abonado" || futuro ? "—" : (s.merged.map((p) => formatTimeShort(p.time)).join(" · ") || "—")}
                      </td>
                      <td className="py-2 pr-3 text-neutral-600">
                        {semHoras ? "—" : minutesToHHMM(s.minutes)}
                      </td>
                      <td className={`py-2 pr-3 font-medium ${s.balance < 0 ? "text-red-600" : s.balance > 0 ? "text-emerald-600" : "text-neutral-500"}`}>
                        {semHoras ? "—" : minutesToHHMM(s.balance)}
                      </td>
                      <td className="py-2 pr-3">
                        {s.status === "abonado" && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Abonado</span>
                        )}
                        {futuro && (
                          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">Ainda não ocorreu</span>
                        )}
                        {!futuro && semRegistroFimDeSemana && (
                          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">Fim de semana</span>
                        )}
                        {!futuro && s.status === "sem_registro" && !semRegistroFimDeSemana && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Sem registro</span>
                        )}
                        {!futuro && s.status === "incompleto" && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Incompleto</span>
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
