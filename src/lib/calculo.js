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

// art. 58, §1º da CLT — variação diária tolerada entre o total trabalhado e a carga horária
export const TOLERANCIA_DIARIA_MIN = 10

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
const DIAS_SEMANA_COMPLETO = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]

export function monthLabelPt(monthStr) {
  const [y, m] = monthStr.split("-").map(Number)
  return `${MESES_PT[m - 1]}/${y}`
}
function weekdayIndex(dayKey) {
  return new Date(`${dayKey}T00:00:00`).getDay()
}
export function weekdayAbbrev(dayKey) {
  return DIAS_SEMANA_ABREV[weekdayIndex(dayKey)]
}
export function weekdayFullPt(dayKey) {
  return DIAS_SEMANA_COMPLETO[weekdayIndex(dayKey)]
}
export function isWeekend(dayKey) {
  const d = weekdayIndex(dayKey)
  return d === 0 || d === 6
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
  const sorted = [...punches].sort((a, b) => new Date(a.time) - new Date(b.time))
  let total = 0
  for (let i = 0; i < sorted.length - 1; i++) {
    const idx = i % 4
    if (idx === 0 || idx === 2 || (incluirIntervalo && idx === 1)) {
      total += (new Date(sorted[i + 1].time) - new Date(sorted[i].time)) / 60000
    }
  }
  return Math.round(total)
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

/* Aplica a tolerância de variação de ponto (art. 58, §1º da CLT) sobre o TOTAL do dia:
   compara direto o total trabalhado com a carga horária contratada (não é preciso
   cadastrar entrada/saída prevista). Se a diferença for de até 10 minutos pra mais ou
   pra menos, o dia é tratado como batendo exatamente a carga horária (nem sobra, nem
   falta). Se passar de 10 minutos, conta a diferença inteira — não só o excedente —
   já que a lei não tolera "um pouco", tolera até o limite e nada além dele. */
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
  const merged = [...punches, ...inclusoes].sort((a, b) => new Date(a.time) - new Date(b.time))
  const semRegistro = merged.length === 0

  if (semRegistro) {
    // não sabemos se é folga (descanso semanal) ou falta não justificada — por isso não entra
    // no cálculo de saldo, só é listado à parte para o administrador verificar manualmente.
    return {
      minutes: 0, expectedMinutes: 0, balance: 0, status: "sem_registro",
      merged: [], semRegistro: true, toleranciaAplicada: false,
    }
  }

  if (merged.length % 4 !== 0) {
    // Faltou batida(s) nesse dia (ex.: sem a saída final) — calcular a hora trabalhada com o
    // padrão de 4 marcações incompleto daria um número enganoso, então não calcula: só sinaliza
    // pra administração completar o registro manualmente.
    return {
      minutes: 0, expectedMinutes, balance: 0, status: "incompleto",
      merged, semRegistro: false, toleranciaAplicada: false,
    }
  }

  const incluirIntervalo = intervaloContaComoJornada(employee?.vinculo, horasDiarias)
  // "minutes" é sempre o que realmente foi trabalhado (a verdade dos pontos batidos) — a
  // tolerância do art. 58 §1º da CLT não reescreve a hora trabalhada, só decide se a
  // diferença em relação à carga horária conta ou não para o saldo/banco de horas.
  const minutes = calcWorkedMinutes(merged, incluirIntervalo)
  const rawBalance = minutes - expectedMinutes
  const toleranciaAplicada = Math.abs(rawBalance) <= TOLERANCIA_DIARIA_MIN
  const balance = toleranciaAplicada ? 0 : rawBalance

  return {
    minutes, expectedMinutes, balance, status: "normal",
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
