import * as XLSX from "xlsx"
import {
  formatCPF, vinculoLabel, horasDiariasToClock, minutesToClock, minutesToHHMM,
  weekdayAbbrev, monthLabelPt, TOLERANCIA_DIARIA_MIN,
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

/**
 * @param {object} params
 * @param {object} params.employee - { cpf, nome, cargo, vinculo, horasDiarias, entradaPrevista }
 * @param {object} params.empresa - { nome, cnpj }
 * @param {"mensal"|"semanal"} params.reportTipo
 * @param {{start:string,end:string}} params.periodRange
 * @param {string} params.espelhoMonth - "YYYY-MM", usado só quando reportTipo === "mensal"
 * @param {Record<string, object>} params.summaries - dayKey -> resultado de buildDaySummary
 * @param {number} params.periodTargetMinutes
 * @param {number} params.totalWorked
 * @param {number} params.totalPositivas
 * @param {number} params.totalNegativas
 * @param {string[]} params.diasSemRegistro
 */
export function exportEspelhoXLSX(params) {
  const {
    employee: emp, empresa, reportTipo, periodRange, espelhoMonth,
    summaries, periodTargetMinutes, totalWorked, totalPositivas, totalNegativas, diasSemRegistro,
  } = params

  const titulo = reportTipo === "semanal" ? "FOLHA DE PONTO SEMANAL" : "FOLHA DE PONTO MENSAL"
  const periodoLabel = reportTipo === "semanal"
    ? `Semana de ${periodRange.start} a ${periodRange.end}`
    : monthLabelPt(espelhoMonth)
  const periodoCurto = reportTipo === "semanal" ? `${periodRange.start} a ${periodRange.end}` : monthLabelPt(espelhoMonth)

  const rows = []
  rows[0] = [titulo]
  rows[1] = [`${empresa.nome || ""}${empresa.cnpj ? " · CNPJ " + empresa.cnpj : ""} — ${periodoLabel}`]
  rows[2] = []
  rows[3] = ["Colaborador:", emp.nome, "", "", "", "Cargo:", emp.cargo, "", "Jornada/dia:", horasDiariasToClock(emp.horasDiarias), "", ""]
  rows[4] = [
    "CPF:", formatCPF(emp.cpf), "", "", "", "Vínculo:", vinculoLabel(emp.vinculo), "",
    reportTipo === "semanal" ? "Semana:" : "Mês/Ano:", periodoCurto, "Tol./dia:", minutesToClock(TOLERANCIA_DIARIA_MIN),
  ]
  rows[5] = []
  rows[6] = ["Dia", "Data", "Sem.", "Entrada", "Saída Almoço", "Retorno Almoço", "Saída", "Horas Trabalhadas", "Horas Extras", "Horas Faltantes", "Alerta", "Observação"]

  const dayKeys = Object.keys(summaries).sort()
  dayKeys.forEach((dayKey) => {
    const s = summaries[dayKey]
    const dia = Number(dayKey.slice(8, 10))
    const dataFmt = `${dayKey.slice(8, 10)}/${dayKey.slice(5, 7)}/${dayKey.slice(0, 4)}`
    const sem = weekdayAbbrev(dayKey)

    let entrada = "", saidaAlmoco = "", retornoAlmoco = "", saida = ""
    let horasTrabalhadas = "00:00", horasExtras = "00:00", horasFaltantes = "00:00"
    let alerta = "", observacao = ""

    if (s.status === "abonado") {
      alerta = "Abonado"
      observacao = s.motivo || ""
    } else if (s.status === "sem_registro") {
      alerta = "Sem registro (verificar se é folga/DSR ou falta não justificada)"
    } else {
      s.merged.forEach((p) => {
        const hhmm = p.time ? `${String(new Date(p.time).getHours()).padStart(2, "0")}:${String(new Date(p.time).getMinutes()).padStart(2, "0")}` : ""
        if (p.type === "Entrada" && !entrada) entrada = hhmm
        if (p.type === "Início do intervalo" && !saidaAlmoco) saidaAlmoco = hhmm
        if (p.type === "Fim do intervalo" && !retornoAlmoco) retornoAlmoco = hhmm
        if (p.type === "Saída" && !saida) saida = hhmm
        if (p.incluida) observacao = observacao ? `${observacao}; Incluída: ${p.motivo}` : `Incluída: ${p.motivo}`
      })
      horasTrabalhadas = minutesToClock(s.minutes)
      horasExtras = minutesToClock(s.balance > 0 ? s.balance : 0)
      horasFaltantes = minutesToClock(s.balance < 0 ? -s.balance : 0)
      if (s.toleranciaAplicada) {
        observacao = observacao ? `${observacao}; Dentro da tolerância (art. 58 §1º CLT)` : "Dentro da tolerância (art. 58 §1º CLT)"
      }
      if (s.balance < 0) {
        alerta = emp.entradaPrevista && emp.saidaPrevista ? "Fora da tolerância (desconto integral)" : "Horas faltantes"
      } else if (s.balance > 0) {
        alerta = "Horas extras"
      }
      if (s.intervaloComputadoNaJornada) {
        observacao = observacao ? `${observacao}; Intervalo computado na jornada (estágio)` : "Intervalo computado na jornada (estágio)"
      }
    }

    rows.push([dia, dataFmt, sem, entrada, saidaAlmoco, retornoAlmoco, saida, horasTrabalhadas, horasExtras, horasFaltantes, alerta, observacao])
  })

  rows.push([])
  rows.push(["", "", "", "", "", "", "Jornada do período:", minutesToClock(periodTargetMinutes), "", "", "", ""])
  rows.push(["", "", "", "", "", "", "Totais:", minutesToClock(totalWorked), minutesToClock(totalPositivas), minutesToClock(totalNegativas), "", ""])
  if (diasSemRegistro.length > 0) {
    rows.push([])
    rows.push(["Dias sem nenhum registro (confirmar folga/DSR ou falta):", diasSemRegistro.join(", ")])
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } },
  ]
  ws["!cols"] = [
    { wch: 5 }, { wch: 11 }, { wch: 5 }, { wch: 9 }, { wch: 12 }, { wch: 13 },
    { wch: 9 }, { wch: 15 }, { wch: 12 }, { wch: 14 }, { wch: 30 }, { wch: 30 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, reportTipo === "semanal" ? "Semana" : "Mês")

  const filename = `folha-ponto-${emp.nome.replace(/\s+/g, "_")}-${reportTipo}-${reportTipo === "semanal" ? periodRange.start : espelhoMonth}.xlsx`
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  triggerDownload(blob, filename)
  return filename
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
    } else if (s.semRegistro) {
      rows.push([day, "", "Sem nenhum registro", "", minutesToHHMM(s.balance)])
    } else {
      s.merged.forEach((p) => {
        const origem = p.incluida ? `Incluída: ${p.motivo}` : p.toleranciaAplicada ? "Dentro da tolerância (art. 58 §1º CLT)" : "Marcação original"
        const hora = new Date(p.time).toLocaleTimeString("pt-BR", { hour12: false })
        rows.push([day, hora, p.type, origem, ""])
      })
      rows.push([day, "", "", s.intervaloComputadoNaJornada ? "Total do dia (intervalo computado na jornada — estágio)" : "Total do dia", minutesToHHMM(s.balance)])
    }
  })
  rows.push([])
  rows.push(["Jornada do período (fixa)", minutesToHHMM(periodTargetMinutes)])
  rows.push(["Total trabalhado no período", minutesToHHMM(totalWorked)])
  rows.push(["Total de horas positivas", minutesToHHMM(totalPositivas)])
  rows.push(["Total de horas negativas", minutesToHHMM(-totalNegativas)])
  rows.push(["Saldo líquido do período", minutesToHHMM(totalWorked - periodTargetMinutes)])
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
  const rows = [
    ["Comprovante de Registro de Ponto do Trabalhador"],
    [],
    ["NSR", record.nsr],
    ["Empregador", `${empresa.nome || "—"}${empresa.cnpj ? " · " + empresa.cnpj : ""}`],
    ["Trabalhador", employee.nome],
    ["CPF", formatCPF(employee.cpf)],
    ["Data e hora", new Date(record.time).toLocaleString("pt-BR", { hour12: false })],
    ["Tipo", record.type],
    ["Hash (SHA-256)", record.hash || "indisponível"],
    [],
    ["Documento gerado por sistema de controle interno. Não é um REP-P certificado no INPI nem possui assinatura eletrônica qualificada ICP-Brasil."],
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws["!cols"] = [{ wch: 18 }, { wch: 55 }]
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 10, c: 0 }, e: { r: 10, c: 1 } },
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Comprovante")
  const filename = `comprovante-ponto-${employee.nome.replace(/\s+/g, "_")}-${record.nsr}.xlsx`
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  triggerDownload(blob, filename)
  return filename
}
