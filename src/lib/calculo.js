export async function sha256(text) {
  try {
    const enc = new TextEncoder().encode(text)
    const buf = await crypto.subtle.digest("SHA-256", enc)
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("")
  } catch {
    return null
  }
}

export function todayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function formatClock(d) {
  return d.toLocaleTimeString("pt-BR", { hour12: false })
}
export function formatDateHeader(d) {
  const s = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
  return s.charAt(0).toUpperCase() + s.slice(1)
}
export function formatDateTime(iso) {
  return new Date(iso).toLocaleString("pt-BR", { hour12: false })
}
export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour12: false })
}
export function formatTimeShort(iso) {
  if (!iso) return ""
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export function formatCPF(v) {
  const d = (v || "").replace(/\D/g, "").slice(0, 11)
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
}
export function formatCNPJ(v) {
  const d = (v || "").replace(/\D/g, "").slice(0, 14)
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
}

export const PUNCH_TYPES = ["Entrada", "Início do intervalo", "Fim do intervalo", "Saída"]
export const FALTA_MOTIVOS = ["Atestado médico", "Falta abonada", "Banco de horas / folga compensatória", "Férias", "Outro"]

// art. 58, §1º da CLT — limite diário (soma das variações) e limite por marcação individual
export const TOLERANCIA_DIARIA_MIN = 10
export const TOLERANCIA_POR_MARCACAO_MIN = 5

/* Regimes de jornada fixos oferecidos no cadastro. As horas semanais e mensais
   são valores fechados (não calculados), conforme definido pelo escritório. */
export const JORNADAS_PRESETS = [
  { horasDiarias: 4, horasSemanais: 20, horasMensais: 100 },
  { horasDiarias: 5, horasSemanais: 25, horasMensais: 125 },
  { horasDiarias: 6, horasSemanais: 30, horasMensais: 150 },
  { horasDiarias: 8, horasSemanais: 40, horasMensais: 200 },
]
export function getJornadaPreset(horasDiarias) {
  return JORNADAS_PRESETS.find((j) => j.horasDiarias === Number(horasDiarias))
}
export function formatRegimeResumo(horasDiarias, jornadaMensalHoras) {
  const preset = getJornadaPreset(horasDiarias)
  const semanal = preset ? preset.horasSemanais : Math.round((Number(horasDiarias) || 0) * 5)
  return `${horasDiarias || 0}h/dia · ${semanal}h/sem · ${jornadaMensalHoras || 0}h/mês`
}

/* Vínculo contratado: define qual legislação rege a jornada e o intervalo do
   trabalhador. "clt" segue a CLT normalmente; "estagiario" segue a Lei do
   Estágio (Lei 11.788/2008), que não é regida pela CLT e tem lógica própria
   de jornada e intervalo. */
export const VINCULOS = [
  { value: "clt", label: "Funcionário Celetista" },
  { value: "estagiario", label: "Estagiário" },
]
export function vinculoLabel(vinculo) {
  return VINCULOS.find((v) => v.value === vinculo)?.label || "Funcionário Celetista"
}

/* Estagiários e celetistas são vinculados a empresas diferentes (ex.: a própria
   sociedade de advogados para os celetistas e uma pessoa jurídica distinta —
   concedente/agente de integração — para os estagiários). "employers" guarda os
   dados das duas empresas; esta função resolve qual delas vale para um dado vínculo. */
export function empresaDoVinculo(employers, vinculo) {
  const key = vinculo === "estagiario" ? "estagiario" : "clt"
  return (employers && employers[key]) || { nome: "", cnpj: "", endereco: "" }
}

/* A Lei do Estágio (art. 10, Lei 11.788/2008) limita a jornada do estagiário a,
   no máximo, 6h diárias e 30h semanais — por isso o regime de 8h/dia não é
   oferecido para estagiários. */
export function jornadasDisponiveis(vinculo) {
  return vinculo === "estagiario" ? JORNADAS_PRESETS.filter((j) => j.horasDiarias <= 6) : JORNADAS_PRESETS
}

/* Para estagiários com jornada de 5h ou 6h/dia, o intervalo de 15 min é uma
   anotação de bom senso do escritório, mas — diferente da CLT (art. 71, que
   sempre exclui o intervalo da jornada) — a Lei do Estágio não impõe que o
   intervalo seja descontado da jornada. Por definição do escritório, esse
   intervalo é computado dentro das horas diárias do estagiário. No regime de
   4h/dia (estagiário ou CLT) não há intervalo previsto. */
export function intervaloContaComoJornada(vinculo, horasDiarias) {
  const h = Number(horasDiarias) || 0
  return vinculo === "estagiario" && h >= 5 && h <= 6
}

const MESES_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
const DIAS_SEMANA_ABREV = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

export function monthLabelPt(monthStr) {
  const [y, m] = monthStr.split("-").map(Number)
  return `${MESES_PT[m - 1]}/${y}`
}
export function weekdayAbbrev(dayKey) {
  return DIAS_SEMANA_ABREV[new Date(`${dayKey}T00:00:00`).getDay()]
}
export function minutesToClock(min) {
  const abs = Math.max(0, Math.round(min || 0))
  return `${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`
}
export function horasDiariasToClock(horasDiarias) {
  const h = Number(horasDiarias) || 0
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`
}
export function minutesToHHMM(min) {
  const sign = min < 0 ? "-" : ""
  const abs = Math.abs(Math.round(min))
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `${sign}${h}h${String(m).padStart(2, "0")}`
}

export function calcWorkedMinutes(punches, incluirIntervalo = false) {
  // Ordena pelo horário real (o que foi de fato batido/lançado), mas soma as durações usando
  // timeCalculo quando existir — é o horário "efetivo" para fins de cálculo, que pode diferir do
  // horário real exibido quando a tolerância do art. 58, §1º da CLT absorve a marcação.
  const sorted = [...punches].sort((a, b) => new Date(a.time) - new Date(b.time))
  let total = 0
  for (let i = 0; i < sorted.length - 1; i++) {
    const idx = i % 4
    if (idx === 0 || idx === 2 || (incluirIntervalo && idx === 1)) {
      const tAtual = new Date(sorted[i].timeCalculo ?? sorted[i].time)
      const tProximo = new Date(sorted[i + 1].timeCalculo ?? sorted[i + 1].time)
      total += (tProximo - tAtual) / 60000
    }
  }
  return Math.round(total)
}

function expectedTimeOnDay(dayKey, hhmm) {
  if (!hhmm) return null
  const d = new Date(`${dayKey}T${hhmm}:00`)
  return isNaN(d.getTime()) ? null : d
}

/* Duração do intervalo intrajornada prevista, a partir da jornada diária (art. 71
   da CLT): jornada > 6h → 1h de intervalo; jornada > 4h e até 6h → 15 min; jornada
   de até 4h (ex.: regime de 4h/dia) → sem intervalo obrigatório. */
export function intervaloPrevistoMinutos(horasDiarias) {
  const h = Number(horasDiarias) || 0
  if (h > 6) return 60
  if (h > 4) return 15
  return 0
}

/* A CLT fixa apenas o MÍNIMO de intervalo por faixa de jornada (art. 71) — nada impede o
   escritório de conceder um intervalo maior por acordo (ex.: 6h/dia trabalhadas com 2h de
   intervalo, ficando 8h à disposição no total). Por isso o intervalo efetivo de um
   funcionário é o valor cadastrado nele (`intervaloMinutos`) quando existir, caindo para o
   mínimo legal da faixa (`intervaloPrevistoMinutos`) só quando não foi customizado. */
export function intervaloEfetivoMinutos(employee) {
  const custom = employee?.intervaloMinutos
  return custom !== null && custom !== undefined && custom !== "" ? Number(custom) : intervaloPrevistoMinutos(employee?.horasDiarias)
}

export function formatIntervaloPrevisto(employee) {
  const min = intervaloEfetivoMinutos(employee)
  if (min === 0) return "Sem intervalo previsto"
  const texto = min >= 60 ? `${(min / 60).toFixed(min % 60 ? 1 : 0)}h` : `${min}min`
  return intervaloContaComoJornada(employee?.vinculo, employee?.horasDiarias) ? `${texto} (computado dentro da jornada)` : texto
}

/* Deriva os horários previstos de início/fim do intervalo a partir da entrada
   prevista e da jornada diária, centralizando o intervalo no meio do turno. */
export function deriveIntervalSchedule(entradaPrevista, horasDiarias, intervaloMin) {
  if (!entradaPrevista) return [null, null]
  const workMin = (Number(horasDiarias) || 0) * 60
  const [h, m] = entradaPrevista.split(":").map(Number)
  const startMinutesOfDay = h * 60 + m
  const inicioIntervaloMin = startMinutesOfDay + workMin / 2
  const fimIntervaloMin = inicioIntervaloMin + intervaloMin
  const toHHMM = (totalMin) => {
    const hh = Math.floor(totalMin / 60) % 24
    const mm = Math.round(totalMin % 60)
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`
  }
  return [toHHMM(inicioIntervaloMin), toHHMM(fimIntervaloMin)]
}

/* Aplica a tolerância de variação de ponto (art. 58, §1º da CLT): variações de
   até 5 min por marcação, com limite diário de 10 min, não são descontadas nem
   contam como hora extra. Cada marcação é avaliada de forma independente — não
   é tudo ou nada no dia: uma marcação com até 5 min de variação é tolerada
   mesmo que outra marcação do mesmo dia passe de 5 min (essa outra nunca é
   tolerada, e entra no cálculo pelo valor integral, não só o excedente). O
   limite diário de 10 min incide sobre a soma das marcações que, isoladamente,
   já estão dentro dos 5 min: se essa soma ultrapassar 10 min, nenhuma delas
   fica tolerada naquele dia. */
export function buildDaySummary(dayKey, punches, treatments, employee) {
  const horasDiarias = employee?.horasDiarias
  const expectedMinutes = (Number(horasDiarias) || 0) * 60
  const falta = treatments.find((t) => t.kind === "falta")
  if (falta) {
    return {
      minutes: expectedMinutes,
      expectedMinutes,
      balance: 0,
      status: "abonado",
      motivo: falta.motivoCategoria + (falta.motivo ? ` — ${falta.motivo}` : ""),
      merged: punches,
      semRegistro: false,
      toleranciaAplicada: false,
    }
  }
  const inclusoes = treatments
    .filter((t) => t.kind === "inclusao")
    .map((t) => ({ nsr: null, type: t.tipoMarcacao, time: t.horario, incluida: true, motivo: t.motivo }))
  let merged = [...punches, ...inclusoes].sort((a, b) => new Date(a.time) - new Date(b.time))
  const semRegistro = merged.length === 0

  if (semRegistro) {
    // não sabemos se é folga (descanso semanal) ou falta não justificada — por isso não entra
    // no cálculo de saldo, só é listado à parte para o administrador verificar manualmente.
    return {
      minutes: 0, expectedMinutes: 0, balance: 0, status: "sem_registro",
      merged: [], semRegistro: true, toleranciaAplicada: false,
    }
  }

  const [inicioIntervaloDerivado, fimIntervaloDerivado] = deriveIntervalSchedule(
    employee?.entradaPrevista, horasDiarias, intervaloEfetivoMinutos(employee)
  )
  const schedule = [
    employee?.entradaPrevista, inicioIntervaloDerivado,
    fimIntervaloDerivado, employee?.saidaPrevista,
  ]
  const hasSchedule = Boolean(employee?.entradaPrevista) && Boolean(employee?.saidaPrevista) && Number(horasDiarias) > 0
  let toleranciaAplicada = false

  if (hasSchedule && merged.length > 0) {
    const deviations = merged.map((p, i) => {
      const expected = expectedTimeOnDay(dayKey, schedule[i % 4])
      return expected ? (new Date(p.time) - expected) / 60000 : 0
    })
    // "Candidata": marcação cuja variação, isoladamente, não passa de 5 min. Marcações que
    // já excedem 5 min sozinhas nunca são candidatas — ficam sempre de fora da tolerância,
    // com o valor integral computado, não importa o total do dia.
    const candidatas = deviations.map((d) => Math.abs(d) <= TOLERANCIA_POR_MARCACAO_MIN)
    const somaCandidatas = deviations.reduce((acc, d, i) => acc + (candidatas[i] ? Math.abs(d) : 0), 0)
    const candidatasToleradas = somaCandidatas <= TOLERANCIA_DIARIA_MIN
    merged = merged.map((p, i) => {
      if (!candidatas[i] || !candidatasToleradas) return p // fora do limite por marcação, ou soma das candidatas passou de 10 min
      const expected = expectedTimeOnDay(dayKey, schedule[i % 4])
      // Mantém "time" com o horário real batido/lançado (o que aparece na tela e nos
      // relatórios); só "timeCalculo" (usado no cálculo de minutos) vira o horário previsto,
      // já que a tolerância diz respeito ao cálculo, não ao registro em si.
      return expected ? { ...p, timeCalculo: expected.toISOString(), toleranciaAplicada: true } : p
    })
    toleranciaAplicada = merged.some((p) => p.toleranciaAplicada)
  }

  const incluirIntervalo = intervaloContaComoJornada(employee?.vinculo, horasDiarias)
  const minutes = calcWorkedMinutes(merged, incluirIntervalo)
  return {
    minutes, expectedMinutes, balance: minutes - expectedMinutes, status: "normal",
    merged, semRegistro, toleranciaAplicada, intervaloComputadoNaJornada: incluirIntervalo,
  }
}

export function weekRangeOf(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  const day = d.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: todayKey(monday), end: todayKey(sunday) }
}

export function monthRangeOf(monthStr) {
  const [y, m] = monthStr.split("-").map(Number)
  const start = `${monthStr}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const end = `${monthStr}-${String(lastDay).padStart(2, "0")}`
  return { start, end }
}
