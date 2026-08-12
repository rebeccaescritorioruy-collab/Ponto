// Gera uma planilha Excel com o espelho de ponto do mês de TODOS os funcionários ativos,
// uma aba por pessoa + uma aba de resumo. Roda fora do navegador (Node), direto contra o
// Supabase, sem precisar abrir o sistema e exportar um por um pela aba Espelho de ponto.
//
// Uso:
//   node --env-file=.env.local scripts/relatorio-mensal.js 2026-08
//
// Se omitir o mês, usa o mês atual.

import { createClient } from "@supabase/supabase-js"
import ExcelJS from "exceljs"
import { mkdirSync, existsSync } from "node:fs"
import {
  todayKey, monthRangeOf, monthLabelPt, buildDaySummary, empresaDoVinculo, minutesToClock, minutesToHHMM,
} from "../src/lib/calculo.js"
import { computeEspelhoRows } from "../src/lib/export.js"

const month = process.argv[2] || todayKey().slice(0, 7)
if (!/^\d{4}-\d{2}$/.test(month)) {
  console.error(`Mês inválido: "${month}". Use o formato AAAA-MM, ex.: 2026-08.`)
  process.exit(1)
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
if (!supabaseUrl || !supabaseKey) {
  console.error("Faltam VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no ambiente. Rode com --env-file=.env.local.")
  process.exit(1)
}
const supabase = createClient(supabaseUrl, supabaseKey)

function mapEmployeeRow(row) {
  return {
    cpf: row.cpf, nome: row.nome, matricula: row.matricula, cargo: row.cargo, ctps: row.ctps,
    lotacao: row.lotacao, vinculo: row.vinculo || "clt", horasDiarias: row.horas_diarias,
    jornadaMensalHoras: row.jornada_mensal_horas, entradaPrevista: row.entrada_prevista,
    saidaPrevista: row.saida_prevista, intervaloMinutos: row.intervalo_minutos,
    comprovanteAlternancia: row.comprovante_alternancia || false, ativo: row.ativo,
  }
}
function mapTreatmentRow(row) {
  return {
    kind: row.kind, motivoCategoria: row.motivo_categoria, motivo: row.motivo,
    tipoMarcacao: row.tipo_marcacao, horario: row.horario, percentualCarga: row.percentual_carga,
  }
}

const INK = "FF393E46"
const GOLD_LIGHT = "FFF5EAD0"
const THIN_BORDER = { style: "thin", color: { argb: "FFD0D0D0" } }
const ALL_BORDERS = { top: THIN_BORDER, left: THIN_BORDER, bottom: THIN_BORDER, right: THIN_BORDER }

function sheetNameFor(nome, usados) {
  let base = nome.replace(/[*?:/\\[\]]/g, "").slice(0, 28).trim() || "Funcionario"
  let name = base
  let i = 2
  while (usados.has(name)) {
    name = `${base.slice(0, 26)} ${i}`
    i++
  }
  usados.add(name)
  return name
}

async function main() {
  console.log(`Gerando relatório de ${monthLabelPt(month)}…`)

  const [{ data: employeeRows, error: empErr }, { data: employerRows, error: employerErr }] = await Promise.all([
    supabase.from("employees").select("*").eq("ativo", true).order("nome"),
    supabase.from("employers").select("*"),
  ])
  if (empErr) throw empErr
  if (employerErr) throw employerErr

  const employers = { clt: {}, estagiario: {} }
  ;(employerRows || []).forEach((row) => { employers[row.vinculo] = row })

  const employees = (employeeRows || []).map(mapEmployeeRow)
  if (employees.length === 0) {
    console.log("Nenhum funcionário ativo encontrado.")
    return
  }

  const { start, end } = monthRangeOf(month)

  const [{ data: allPunches, error: pErr }, { data: allTreatments, error: tErr }] = await Promise.all([
    supabase.from("punches").select("*").gte("time", `${start}T00:00:00`).lte("time", `${end}T23:59:59`).order("time"),
    supabase.from("treatments").select("*").gte("date", start).lte("date", end),
  ])
  if (pErr) throw pErr
  if (tErr) throw tErr

  const punchesByCpf = {}
  ;(allPunches || []).forEach((p) => { (punchesByCpf[p.cpf] ??= []).push(p) })
  const treatmentsByCpf = {}
  ;(allTreatments || []).forEach((t) => { (treatmentsByCpf[t.cpf] ??= []).push(t) })

  const workbook = new ExcelJS.Workbook()
  const usados = new Set()

  const resumoSheet = workbook.addWorksheet("Resumo")
  usados.add("Resumo")
  resumoSheet.columns = [
    { width: 32 }, { width: 14 }, { width: 16 }, { width: 16 }, { width: 16 },
  ]
  const resumoHeader = resumoSheet.addRow(["Funcionário", "Vínculo", "Total trabalhado", "Saldo do mês", "Dias sem registro"])
  resumoHeader.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INK } }
    cell.border = ALL_BORDERS
  })

  for (const employee of employees) {
    const punches = punchesByCpf[employee.cpf] || []
    const treatmentsByDay = {}
    ;(treatmentsByCpf[employee.cpf] || []).forEach((t) => {
      (treatmentsByDay[t.date] ??= []).push(mapTreatmentRow(t))
    })

    const byDay = {}
    const cursor = new Date(`${start}T00:00:00`)
    const endDate = new Date(`${end}T00:00:00`)
    while (cursor <= endDate) {
      byDay[todayKey(cursor)] = []
      cursor.setDate(cursor.getDate() + 1)
    }
    punches.forEach((p) => {
      const dk = todayKey(new Date(p.time))
      ;(byDay[dk] ??= []).push(p)
    })

    const summaries = {}
    Object.keys(byDay).forEach((day) => {
      summaries[day] = buildDaySummary(day, byDay[day], treatmentsByDay[day] || [], employee)
    })

    const totalWorked = Object.values(summaries).reduce((acc, s) => acc + s.minutesCreditadas, 0)
    const totalPositivas = Object.values(summaries).reduce((acc, s) => acc + (s.balance > 0 ? s.balance : 0), 0)
    const totalNegativas = Object.values(summaries).reduce((acc, s) => acc + (s.balance < 0 ? -s.balance : 0), 0)
    const hoje = todayKey()
    const diasSemRegistro = Object.keys(summaries).filter((d) => {
      const s = summaries[d]
      const weekday = new Date(`${d}T00:00:00`).getDay()
      return s.semRegistro && d <= hoje && weekday !== 0 && weekday !== 6
    })

    const empresa = empresaDoVinculo(employers, employee.vinculo)
    resumoSheet.addRow([
      employee.nome, employee.vinculo === "estagiario" ? "Estagiário" : "CLT",
      minutesToClock(totalWorked), minutesToHHMM(totalPositivas - totalNegativas), diasSemRegistro.length,
    ])

    const sheet = workbook.addWorksheet(sheetNameFor(employee.nome, usados))
    sheet.columns = [
      { width: 12 }, { width: 13 }, { width: 9 }, { width: 13 }, { width: 14 },
      { width: 9 }, { width: 16 }, { width: 14 }, { width: 14 }, { width: 55 },
    ]
    function infoRow(label, value) {
      const row = sheet.addRow([label, value])
      row.getCell(1).font = { bold: true }
      sheet.mergeCells(row.number, 2, row.number, 10)
    }
    infoRow("Empregador", empresa.nome || "")
    infoRow("CNPJ/CEI", empresa.cnpj || "")
    infoRow("Trabalhador", `${employee.nome}${employee.matricula ? ` — Matrícula ${employee.matricula}` : ""}`)
    infoRow("Cargo / Lotação", `${employee.cargo || ""}${employee.lotacao ? ` — ${employee.lotacao}` : ""}`)
    infoRow("Período", monthLabelPt(month))
    sheet.addRow([])

    const headerRow = sheet.addRow([
      "Data", "Dia da semana", "Entrada", "Saída intervalo", "Retorno intervalo", "Saída",
      "Horas trabalhadas", "Horas positivas", "Horas negativas", "Observação",
    ])
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INK } }
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
      cell.border = ALL_BORDERS
    })
    headerRow.height = 26
    sheet.views = [{ state: "frozen", ySplit: headerRow.number }]

    computeEspelhoRows(summaries).forEach((r) => {
      const row = sheet.addRow([
        r.dataFmt, r.diaSemana, r.entrada, r.saidaIntervalo, r.retornoIntervalo, r.saida,
        r.horasTrabalhadas, r.horasPositivas, r.horasNegativas, r.observacao,
      ])
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = ALL_BORDERS
        cell.alignment = { vertical: "middle" }
        if (r.muted) cell.font = { italic: true, color: { argb: "FF999999" } }
      })
    })

    sheet.addRow([])
    function totalRow(label, value) {
      const row = sheet.addRow([label])
      sheet.mergeCells(row.number, 1, row.number, 6)
      const valueCell = row.getCell(7)
      valueCell.value = value
      valueCell.alignment = { horizontal: "right" }
      row.font = { bold: true }
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GOLD_LIGHT } }
      })
    }
    totalRow("Total trabalhado (bruto)", minutesToClock(totalWorked))
    totalRow("Total de horas positivas", minutesToClock(totalPositivas))
    totalRow("Total de horas negativas", minutesToClock(totalNegativas))
    totalRow("Saldo líquido do período (positivas − negativas)", minutesToHHMM(totalPositivas - totalNegativas))
  }

  const outDir = "relatorios"
  if (!existsSync(outDir)) mkdirSync(outDir)
  const outPath = `${outDir}/relatorio-ponto-${month}.xlsx`
  await workbook.xlsx.writeFile(outPath)
  console.log(`Pronto: ${outPath} (${employees.length} funcionário${employees.length === 1 ? "" : "s"})`)
}

main().catch((err) => {
  console.error("Erro ao gerar relatório:", err.message || err)
  process.exit(1)
})
