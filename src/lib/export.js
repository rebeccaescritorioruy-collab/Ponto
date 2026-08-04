import ExcelJS from "exceljs"
import {
  formatCPF, vinculoLabel, minutesToClock, minutesToHHMM,
  weekdayFullPt, isWeekend, todayKey,
} from "./calculo"

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
const INK = "FF393E46" // grafite da marca (cabeçalhos)
const GOLD_LIGHT = "FFF5EAD0" // dourado claro da marca (destaque dos totais)
const THIN_BORDER = { style: "thin", color: { argb: "FFD0D0D0" } }
const ALL_BORDERS = { top: THIN_BORDER, left: THIN_BORDER, bottom: THIN_BORDER, right: THIN_BORDER }

function styleHeaderRow(row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INK } }
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
    cell.border = ALL_BORDERS
  })
  row.height = 26
}

function styleDataRow(row, { muted = false } = {}) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.border = ALL_BORDERS
    cell.alignment = { vertical: "middle" }
    if (muted) cell.font = { italic: true, color: { argb: "FF999999" } }
  })
}

/**
 * @param {object} params
 * @param {object} params.employee - { cpf, nome, cargo, ctps, lotacao, matricula, vinculo, horasDiarias }
 * @param {object} params.empresa - { nome, cnpj }
 * @param {"mensal"|"semanal"} params.reportTipo
 * @param {{start:string,end:string}} params.periodRange
 * @param {string} params.espelhoMonth - "YYYY-MM", usado só quando reportTipo === "mensal"
 * @param {Record<string, object>} params.summaries - dayKey -> resultado de buildDaySummary
 * @param {number} params.totalWorked
 * @param {number} params.totalPositivas
 * @param {number} params.totalNegativas
 */
export function exportEspelhoXLSX(params) {
  const { employee: emp, reportTipo, periodRange, espelhoMonth } = params
  const filename = `folha-ponto-${emp.nome.replace(/\s+/g, "_")}-${reportTipo}-${reportTipo === "semanal" ? periodRange.start : espelhoMonth}.xlsx`
  buildEspelhoWorkbook(params).then((buffer) => {
    triggerDownload(new Blob([buffer], { type: XLSX_MIME }), filename)
  })
  return filename
}

/** Calcula as linhas do espelho (uma por dia) num formato puro, reaproveitado tanto pela
    exportação em Excel quanto pela pré-visualização em tela — garante que as duas mostrem
    exatamente a mesma coisa. */
export function computeEspelhoRows(summaries) {
  const hoje = todayKey()
  return Object.keys(summaries).sort().map((dayKey) => {
    const s = summaries[dayKey]
    const dataFmt = `${dayKey.slice(8, 10)}/${dayKey.slice(5, 7)}/${dayKey.slice(0, 4)}`
    const diaSemana = weekdayFullPt(dayKey)
    const futuro = dayKey > hoje

    let entrada = "", saidaIntervalo = "", retornoIntervalo = "", saida = ""
    let horasTrabalhadas = "", horasPositivas = "", horasNegativas = ""
    let observacao = ""

    if (futuro) {
      observacao = "Ainda não ocorreu — preencha os horários quando o dia acontecer"
    } else if (s.status === "abonado") {
      // Abonado zera o saldo (não penaliza), mas mostra o que realmente foi batido — não
      // esconde atrás da meta cheia do dia.
      s.merged.forEach((p) => {
        const hhmm = `${String(new Date(p.time).getHours()).padStart(2, "0")}:${String(new Date(p.time).getMinutes()).padStart(2, "0")}`
        if (p.type === "Entrada" && !entrada) entrada = hhmm
        if (p.type === "Início do intervalo" && !saidaIntervalo) saidaIntervalo = hhmm
        if (p.type === "Fim do intervalo" && !retornoIntervalo) retornoIntervalo = hhmm
        if (p.type === "Saída" && !saida) saida = hhmm
      })
      horasTrabalhadas = minutesToClock(s.minutes)
      horasPositivas = "0:00"
      horasNegativas = "0:00"
      observacao = `Abonado: ${s.motivo || ""}`
    } else if (s.status === "sem_registro") {
      observacao = isWeekend(dayKey)
        ? "Fim de semana"
        : "Sem registro — verificar se é folga/DSR ou falta não justificada"
    } else if (s.status === "incompleto") {
      s.merged.forEach((p) => {
        const hhmm = `${String(new Date(p.time).getHours()).padStart(2, "0")}:${String(new Date(p.time).getMinutes()).padStart(2, "0")}`
        if (p.type === "Entrada" && !entrada) entrada = hhmm
        if (p.type === "Início do intervalo" && !saidaIntervalo) saidaIntervalo = hhmm
        if (p.type === "Fim do intervalo" && !retornoIntervalo) retornoIntervalo = hhmm
        if (p.type === "Saída" && !saida) saida = hhmm
      })
      observacao = "Marcação incompleta nesse dia — confirmar horário que falta com o(a) colaborador(a)"
    } else {
      s.merged.forEach((p) => {
        const hhmm = `${String(new Date(p.time).getHours()).padStart(2, "0")}:${String(new Date(p.time).getMinutes()).padStart(2, "0")}`
        if (p.type === "Entrada" && !entrada) entrada = hhmm
        if (p.type === "Início do intervalo" && !saidaIntervalo) saidaIntervalo = hhmm
        if (p.type === "Fim do intervalo" && !retornoIntervalo) retornoIntervalo = hhmm
        if (p.type === "Saída" && !saida) saida = hhmm
        if (p.incluida) observacao = observacao ? `${observacao}; Incluída: ${p.motivo}` : `Incluída: ${p.motivo}`
      })
      horasTrabalhadas = minutesToClock(s.minutes)
      horasPositivas = minutesToClock(s.balance > 0 ? s.balance : 0)
      horasNegativas = minutesToClock(s.balance < 0 ? -s.balance : 0)
      if (s.toleranciaAplicada) {
        observacao = observacao ? `${observacao}; Dentro da tolerância diária de 10min (art. 58 §1º CLT)` : "Dentro da tolerância diária de 10min (art. 58 §1º CLT)"
      }
      if (s.intervaloComputadoNaJornada) {
        observacao = observacao ? `${observacao}; Intervalo computado na jornada (estágio)` : "Intervalo computado na jornada (estágio)"
      }
      if (s.cargaReduzidaAplicada) {
        const nota = `Carga reduzida (${s.percentualCarga}%)${s.cargaReduzidaMotivo ? ": " + s.cargaReduzidaMotivo : ""}`
        observacao = observacao ? `${observacao}; ${nota}` : nota
      }
    }

    return {
      dayKey, dataFmt, diaSemana, entrada, saidaIntervalo, retornoIntervalo, saida,
      horasTrabalhadas, horasPositivas, horasNegativas, observacao,
      muted: futuro || s.status === "sem_registro",
    }
  })
}

async function buildEspelhoWorkbook(params) {
  const {
    employee: emp, empresa, reportTipo, periodRange,
    summaries, totalWorked, totalPositivas, totalNegativas,
  } = params

  const hoje = todayKey()
  const periodoCurto = `${periodRange.start} a ${periodRange.end}`
  const disponivelAte = periodRange.end > hoje
    ? ` (dados disponíveis até ${hoje.slice(8, 10)}/${hoje.slice(5, 7)}/${hoje.slice(0, 4)})`
    : ""

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(reportTipo === "semanal" ? "Semana" : "Mês")
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
  infoRow("Trabalhador", `${emp.nome}${emp.matricula ? ` — Matrícula ${emp.matricula}` : ""}`)
  infoRow("Cargo / Lotação", `${emp.cargo || ""}${emp.lotacao ? ` — ${emp.lotacao}` : ""}`)
  infoRow("CTPS", emp.ctps || "")
  infoRow("Período", `${periodoCurto}${disponivelAte}`)
  sheet.addRow([])

  const headerRow = sheet.addRow([
    "Data", "Dia da semana", "Entrada", "Saída intervalo", "Retorno intervalo", "Saída",
    "Horas trabalhadas", "Horas positivas", "Horas negativas", "Observação / Justificativa / Assinatura",
  ])
  styleHeaderRow(headerRow)
  sheet.views = [{ state: "frozen", ySplit: headerRow.number }]

  computeEspelhoRows(summaries).forEach((r) => {
    const row = sheet.addRow([
      r.dataFmt, r.diaSemana, r.entrada, r.saidaIntervalo, r.retornoIntervalo, r.saida,
      r.horasTrabalhadas, r.horasPositivas, r.horasNegativas, r.observacao,
    ])
    styleDataRow(row, { muted: r.muted })
  })

  sheet.addRow([])
  const totaisHeaderRow = sheet.addRow([`TOTAIS DO PERÍODO — ${periodoCurto}`])
  sheet.mergeCells(totaisHeaderRow.number, 1, totaisHeaderRow.number, 10)
  totaisHeaderRow.getCell(1).font = { bold: true, color: { argb: "FFFFFFFF" } }
  totaisHeaderRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: INK } }
  totaisHeaderRow.getCell(1).alignment = { horizontal: "center" }
  totaisHeaderRow.height = 20

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

  sheet.addRow([])
  sheet.addRow([])
  const sigLineRow = sheet.addRow([])
  sheet.mergeCells(sigLineRow.number, 1, sigLineRow.number, 4)
  sigLineRow.getCell(1).border = { bottom: { style: "thin", color: { argb: INK } } }
  const sigLabelRow = sheet.addRow([`Assinatura de ${emp.nome}`])
  sigLabelRow.getCell(1).font = { italic: true, size: 10, color: { argb: "FF666666" } }

  return workbook.xlsx.writeBuffer()
}

export function exportEspelhoCSV(params) {
  const {
    employee: emp, empresa, reportTipo, periodRange, espelhoMonth,
    summaries, periodTargetMinutes, totalWorked, totalPositivas, totalNegativas, diasSemRegistro,
  } = params

  const periodoLabel = reportTipo === "semanal" ? `Semana de ${periodRange.start} a ${periodRange.end}` : espelhoMonth
  const rows = [
    [reportTipo === "semanal" ? "Espelho de Ponto Eletrônico — Relatório Semanal" : "Espelho de Ponto Eletrônico — Relatório Mensal"],
    ["Empregador", empresa.nome, empresa.cnpj],
    ["Trabalhador", emp.nome, formatCPF(emp.cpf), "Cargo: " + (emp.cargo || "")],
    ["Vínculo", vinculoLabel(emp.vinculo)],
    ["Período", periodoLabel],
    ["Jornada diária prevista", `${emp.horasDiarias || 0}h`],
    [],
    ["Data", "Hora", "Tipo de marcação", "Origem", "Saldo do dia"],
  ]
  Object.keys(summaries).sort().forEach((day) => {
    const s = summaries[day]
    if (s.status === "abonado") {
      rows.push([day, "", "Dia abonado", s.motivo, "0h00"])
    } else if (s.status === "sem_registro") {
      rows.push([day, "", isWeekend(day) ? "Fim de semana" : "Sem nenhum registro", "", "0h00"])
    } else if (s.status === "incompleto") {
      s.merged.forEach((p) => {
        const hora = new Date(p.time).toLocaleTimeString("pt-BR", { hour12: false })
        rows.push([day, hora, p.type, "Marcação incompleta nesse dia", ""])
      })
    } else {
      s.merged.forEach((p) => {
        const origem = p.incluida ? `Incluída: ${p.motivo}` : "Marcação original"
        const hora = new Date(p.time).toLocaleTimeString("pt-BR", { hour12: false })
        rows.push([day, hora, p.type, origem, ""])
      })
      let totalLabel = s.intervaloComputadoNaJornada ? "Total do dia (intervalo computado na jornada — estágio)" : "Total do dia"
      if (s.toleranciaAplicada) totalLabel += " — dentro da tolerância diária de 10min (art. 58 §1º CLT)"
      rows.push([day, "", "", totalLabel, minutesToHHMM(s.balance)])
    }
  })
  rows.push([])
  rows.push(["Jornada do período (fixa)", minutesToHHMM(periodTargetMinutes)])
  rows.push(["Total trabalhado no período", minutesToHHMM(totalWorked)])
  rows.push(["Total de horas positivas", minutesToHHMM(totalPositivas)])
  rows.push(["Total de horas negativas", minutesToHHMM(totalNegativas)])
  // Soma o saldo já ajustado pela tolerância de cada dia (totalPositivas - totalNegativas) —
  // não o total bruto trabalhado contra a meta do período, que perderia o perdão diário.
  rows.push(["Saldo líquido do período", minutesToHHMM(totalPositivas - totalNegativas)])
  if (diasSemRegistro.length > 0) {
    rows.push([])
    rows.push(["Dias sem nenhum registro (verificar se é folga ou falta não justificada)", diasSemRegistro.join(", ")])
  }
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n")
  const filename = `espelho-ponto-${emp.nome.replace(/\s+/g, "_")}-${reportTipo}-${reportTipo === "semanal" ? periodRange.start : espelhoMonth}.csv`
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
  triggerDownload(blob, filename)
  return filename
}

export function buildComprovanteText(record, employee, empresa) {
  return [
    "Comprovante de Registro de Ponto do Trabalhador",
    "",
    `NSR: ${record.nsr}`,
    `Empregador: ${empresa.nome || "—"}${empresa.cnpj ? " · " + empresa.cnpj : ""}`,
    `Trabalhador: ${employee.nome} · ${formatCPF(employee.cpf)}`,
    `Data e hora: ${new Date(record.time).toLocaleString("pt-BR", { hour12: false })}`,
    `Tipo: ${record.type}`,
    `Hash (SHA-256): ${record.hash || "indisponível"}`,
    "",
    "Documento gerado por sistema de controle interno. Não é um REP-P certificado no INPI nem possui assinatura",
    "eletrônica qualificada ICP-Brasil.",
  ].join("\n")
}

export function downloadComprovanteTexto(record, employee, empresa) {
  const texto = buildComprovanteText(record, employee, empresa)
  const filename = `comprovante-ponto-${employee.nome.replace(/\s+/g, "_")}-${record.nsr}.txt`
  const blob = new Blob([texto], { type: "text/plain;charset=utf-8;" })
  triggerDownload(blob, filename)
  return filename
}

export function downloadComprovanteXLSX(record, employee, empresa) {
  const filename = `comprovante-ponto-${employee.nome.replace(/\s+/g, "_")}-${record.nsr}.xlsx`
  buildComprovanteWorkbook(record, employee, empresa).then((buffer) => {
    triggerDownload(new Blob([buffer], { type: XLSX_MIME }), filename)
  })
  return filename
}

async function buildComprovanteWorkbook(record, employee, empresa) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("Comprovante")
  sheet.columns = [{ width: 18 }, { width: 55 }]

  const titleRow = sheet.addRow(["Comprovante de Registro de Ponto do Trabalhador"])
  sheet.mergeCells(titleRow.number, 1, titleRow.number, 2)
  titleRow.getCell(1).font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } }
  titleRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: INK } }
  titleRow.getCell(1).alignment = { horizontal: "center" }
  titleRow.height = 22
  sheet.addRow([])

  function fieldRow(label, value) {
    const row = sheet.addRow([label, value])
    row.getCell(1).font = { bold: true }
    row.eachCell({ includeEmpty: true }, (cell) => { cell.border = ALL_BORDERS })
  }
  fieldRow("NSR", record.nsr)
  fieldRow("Empregador", `${empresa.nome || "—"}${empresa.cnpj ? " · " + empresa.cnpj : ""}`)
  fieldRow("Trabalhador", employee.nome)
  fieldRow("CPF", formatCPF(employee.cpf))
  fieldRow("Data e hora", new Date(record.time).toLocaleString("pt-BR", { hour12: false }))
  fieldRow("Tipo", record.type)
  fieldRow("Hash (SHA-256)", record.hash || "indisponível")

  sheet.addRow([])
  const noteRow = sheet.addRow([
    "Documento gerado por sistema de controle interno. Não é um REP-P certificado no INPI nem possui " +
    "assinatura eletrônica qualificada ICP-Brasil.",
  ])
  sheet.mergeCells(noteRow.number, 1, noteRow.number, 2)
  noteRow.getCell(1).font = { italic: true, size: 9, color: { argb: "FF666666" } }
  noteRow.getCell(1).alignment = { wrapText: true }

  return workbook.xlsx.writeBuffer()
}
