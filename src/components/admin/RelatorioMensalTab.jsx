import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useEmployees } from "../../hooks/useEmployees"
import {
  todayKey, monthRangeOf, monthLabelPt, buildDaySummary, minutesToHHMM, vinculoLabel, resolveEmployeeForDay,
} from "../../lib/calculo"
import Card from "../ui/Card"
import TextField from "../ui/TextField"
import Alert from "../ui/Alert"
import Button from "../ui/Button"

function mapTreatmentRow(row) {
  return {
    kind: row.kind,
    motivoCategoria: row.motivo_categoria,
    motivo: row.motivo,
    tipoMarcacao: row.tipo_marcacao,
    horario: row.horario,
    percentualCarga: row.percentual_carga,
  }
}

function mapVigenciaRow(row) {
  return {
    cpf: row.cpf,
    vigenteDesde: row.vigente_desde,
    horasDiarias: row.horas_diarias,
    jornadaMensalHoras: row.jornada_mensal_horas,
    entradaPrevista: row.entrada_prevista,
    saidaPrevista: row.saida_prevista,
    intervaloMinutos: row.intervalo_minutos,
  }
}

// Monta os dias (YYYY-MM-DD) de um intervalo, inclusive.
function diasDoIntervalo(start, end) {
  const dias = []
  const cursor = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T00:00:00`)
  while (cursor <= endDate) {
    dias.push(todayKey(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dias
}

function csvEscape(value) {
  const s = String(value ?? "")
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export default function RelatorioMensalTab() {
  const { employees } = useEmployees()

  const [month, setMonth] = useState(todayKey().slice(0, 7))
  const [rows, setRows] = useState([])
  const [loadedKey, setLoadedKey] = useState("")
  const [error, setError] = useState(null)

  // Funcionários que entram no relatório: ativos e sem "teste" no nome.
  const alvo = useMemo(
    () => employees.filter((e) => e.ativo !== false && !e.nome.toLowerCase().includes("teste")),
    [employees]
  )

  const periodRange = useMemo(() => monthRangeOf(month), [month])
  const key = `${month}:${alvo.map((e) => e.cpf).join(",")}`
  const loading = alvo.length > 0 && loadedKey !== key

  useEffect(() => {
    if (alvo.length === 0) return
    let cancelled = false
    const { start, end } = periodRange
    const dias = diasDoIntervalo(start, end)

    Promise.all(
      alvo.map(async (emp) => {
        const [{ data: punchRows, error: pErr }, { data: treatRows, error: tErr }, { data: vigRows, error: vErr }] = await Promise.all([
          supabase.from("punches").select("*").eq("cpf", emp.cpf)
            .gte("time", `${start}T00:00:00`).lte("time", `${end}T23:59:59`).order("time"),
          supabase.from("treatments").select("*").eq("cpf", emp.cpf)
            .gte("date", start).lte("date", end),
          supabase.from("regime_vigencias").select("*").eq("cpf", emp.cpf),
        ])
        if (pErr || tErr || vErr) throw (pErr || tErr || vErr)

        const treatmentsByDay = {}
        ;(treatRows || []).forEach((row) => {
          treatmentsByDay[row.date] = [...(treatmentsByDay[row.date] || []), mapTreatmentRow(row)]
        })
        const vigencias = (vigRows || []).map(mapVigenciaRow)
        const byDay = {}
        dias.forEach((d) => { byDay[d] = [] })
        ;(punchRows || []).forEach((p) => {
          const dk = todayKey(new Date(p.time))
          if (!byDay[dk]) byDay[dk] = []
          byDay[dk].push(p)
        })

        let positivas = 0
        let negativas = 0
        let trabalhado = 0
        dias.forEach((d) => {
          const empDoDia = resolveEmployeeForDay(emp, vigencias, d)
          const s = buildDaySummary(d, byDay[d], treatmentsByDay[d] || [], empDoDia)
          if (s.balance > 0) positivas += s.balance
          else if (s.balance < 0) negativas += -s.balance
          trabalhado += s.minutesCreditadas
        })
        return {
          cpf: emp.cpf, nome: emp.nome, vinculo: emp.vinculo,
          positivas, negativas, saldo: positivas - negativas, trabalhado,
        }
      })
    )
      .then((result) => {
        if (cancelled) return
        result.sort((a, b) => a.nome.localeCompare(b.nome))
        setRows(result)
        setLoadedKey(key)
        setError(null)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || String(err))
      })

    return () => { cancelled = true }
  }, [alvo, periodRange, key])

  const totais = useMemo(() => rows.reduce(
    (acc, r) => ({
      positivas: acc.positivas + r.positivas,
      negativas: acc.negativas + r.negativas,
      saldo: acc.saldo + r.saldo,
      trabalhado: acc.trabalhado + r.trabalhado,
    }),
    { positivas: 0, negativas: 0, saldo: 0, trabalhado: 0 }
  ), [rows])

  function baixarPDF() {
    const geradoEm = new Date().toLocaleString("pt-BR", { hour12: false })
    const corpo = rows.map((r) => `
      <tr>
        <td class="nome">${r.nome}</td>
        <td>${vinculoLabel(r.vinculo)}</td>
        <td class="num">${minutesToHHMM(r.trabalhado)}</td>
        <td class="num pos">${minutesToHHMM(r.positivas)}</td>
        <td class="num neg">${minutesToHHMM(r.negativas)}</td>
        <td class="num saldo ${r.saldo < 0 ? "neg" : r.saldo > 0 ? "pos" : ""}">${minutesToHHMM(r.saldo)}</td>
      </tr>`).join("")

    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
      <title>Relatório mensal de horas — ${monthLabelPt(month)}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #393e46; margin: 32px; }
        header { border-bottom: 3px solid #d0a144; padding-bottom: 12px; margin-bottom: 20px; }
        h1 { font-size: 18px; margin: 0 0 2px; }
        .sub { font-size: 12px; color: #797979; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        thead th { background: #393e46; color: #fff; text-align: left; padding: 8px 10px; font-weight: 600; }
        thead th.num { text-align: right; }
        tbody td { padding: 7px 10px; border-bottom: 1px solid #eaeaea; }
        tbody tr:nth-child(even) td { background: #faf7f0; }
        td.num { text-align: right; font-variant-numeric: tabular-nums; }
        td.nome { font-weight: 600; }
        .pos { color: #1f7a4d; }
        .neg { color: #b42318; }
        td.saldo { font-weight: 700; }
        tfoot td { padding: 9px 10px; border-top: 2px solid #393e46; font-weight: 700; background: #f5ead0; }
        tfoot td.num { text-align: right; font-variant-numeric: tabular-nums; }
        footer { margin-top: 18px; font-size: 10px; color: #797979; }
        @media print { body { margin: 12mm; } }
      </style></head><body>
      <header>
        <h1>Relatório Mensal de Horas</h1>
        <div class="sub">Ruy Molina Advocacia &middot; ${monthLabelPt(month)} &middot; ${rows.length} funcionário${rows.length === 1 ? "" : "s"}</div>
      </header>
      <table>
        <thead><tr>
          <th>Funcionário</th><th>Vínculo</th><th class="num">Trabalhado</th>
          <th class="num">Horas positivas</th><th class="num">Horas negativas</th><th class="num">Saldo</th>
        </tr></thead>
        <tbody>${corpo}</tbody>
        <tfoot><tr>
          <td colspan="2">Total</td>
          <td class="num">${minutesToHHMM(totais.trabalhado)}</td>
          <td class="num pos">${minutesToHHMM(totais.positivas)}</td>
          <td class="num neg">${minutesToHHMM(totais.negativas)}</td>
          <td class="num">${minutesToHHMM(totais.saldo)}</td>
        </tr></tfoot>
      </table>
      <footer>Gerado em ${geradoEm}. Horas positivas/negativas são a soma dia a dia, já com a tolerância de ponto aplicada (art. 58 §1º CLT).</footer>
      <script>window.onload = function () { window.print(); };</script>
      </body></html>`

    const win = window.open("", "_blank")
    if (!win) {
      setError("Não foi possível abrir a janela de impressão — verifique se o navegador bloqueou pop-ups.")
      return
    }
    win.document.write(html)
    win.document.close()
  }

  function baixarCSV() {
    const linhas = [
      [`Relatório mensal de horas — ${monthLabelPt(month)}`],
      ["Funcionário", "Vínculo", "Trabalhado", "Horas positivas", "Horas negativas", "Saldo"],
      ...rows.map((r) => [
        r.nome, vinculoLabel(r.vinculo), minutesToHHMM(r.trabalhado),
        minutesToHHMM(r.positivas), minutesToHHMM(r.negativas), minutesToHHMM(r.saldo),
      ]),
      [],
      ["TOTAL", "", minutesToHHMM(totais.trabalhado), minutesToHHMM(totais.positivas),
        minutesToHHMM(totais.negativas), minutesToHHMM(totais.saldo)],
    ]
    const csv = linhas.map((l) => l.map(csvEscape).join(";")).join("\n")
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `relatorio-mensal-horas-${month}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }

  return (
    <div className="space-y-6">
      {error && <Alert tone="error">{error}</Alert>}

      <Card>
        <h3 className="mb-1 text-base font-semibold text-neutral-900">Relatório mensal de horas</h3>
        <p className="mb-4 text-xs text-neutral-500">
          Soma as horas positivas e negativas de todos os dias do mês, por funcionário, e mostra o saldo.
          Funcionários com "teste" no nome não entram.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <TextField label="Mês" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <Button onClick={baixarPDF} disabled={loading || rows.length === 0}>
            Baixar PDF
          </Button>
          <Button variant="secondary" onClick={baixarCSV} disabled={loading || rows.length === 0}>
            Baixar (.csv)
          </Button>
        </div>
      </Card>

      {alvo.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhum funcionário ativo para exibir.</p>
      ) : loading ? (
        <p className="text-sm text-neutral-500">Carregando {monthLabelPt(month)}…</p>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500">
                  <th className="py-2 pr-3 font-medium">Funcionário</th>
                  <th className="py-2 pr-3 font-medium">Vínculo</th>
                  <th className="py-2 pr-3 text-right font-medium">Trabalhado</th>
                  <th className="py-2 pr-3 text-right font-medium">Horas positivas</th>
                  <th className="py-2 pr-3 text-right font-medium">Horas negativas</th>
                  <th className="py-2 pr-3 text-right font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((r) => (
                  <tr key={r.cpf}>
                    <td className="py-2 pr-3 text-neutral-900">{r.nome}</td>
                    <td className="py-2 pr-3 text-neutral-500">{vinculoLabel(r.vinculo)}</td>
                    <td className="py-2 pr-3 text-right text-neutral-600">{minutesToHHMM(r.trabalhado)}</td>
                    <td className="py-2 pr-3 text-right text-emerald-600">{minutesToHHMM(r.positivas)}</td>
                    <td className="py-2 pr-3 text-right text-red-600">{minutesToHHMM(r.negativas)}</td>
                    <td className={`py-2 pr-3 text-right font-medium ${r.saldo < 0 ? "text-red-600" : r.saldo > 0 ? "text-emerald-600" : "text-neutral-500"}`}>
                      {minutesToHHMM(r.saldo)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-neutral-200 font-semibold text-neutral-900">
                  <td className="py-2 pr-3" colSpan={2}>Total ({rows.length} funcionário{rows.length === 1 ? "" : "s"})</td>
                  <td className="py-2 pr-3 text-right">{minutesToHHMM(totais.trabalhado)}</td>
                  <td className="py-2 pr-3 text-right text-emerald-700">{minutesToHHMM(totais.positivas)}</td>
                  <td className="py-2 pr-3 text-right text-red-700">{minutesToHHMM(totais.negativas)}</td>
                  <td className={`py-2 pr-3 text-right ${totais.saldo < 0 ? "text-red-700" : "text-emerald-700"}`}>
                    {minutesToHHMM(totais.saldo)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
