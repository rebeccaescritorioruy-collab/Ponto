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
// Todas essas categorias são faltas JUSTIFICADAS (creditam o dia inteiro, não descontam nada),
// exceto "Falta não justificada", que é tratada de forma oposta em buildDaySummary: desconta
// o dia inteiro do saldo, já que não há amparo legal para abonar.
export const FALTA_MOTIVOS = [
  "Atestado médico", "Falta abonada", "Banco de horas / folga compensatória", "Férias", "Outro",
  "Falta não justificada",
]
export const FALTA_NAO_JUSTIFICADA = "Falta não justificada"

// Tolerância de ponto do art. 58 §1º CLT: "não serão descontadas nem computadas como jornada
// extraordinária as variações de horário no registro de ponto não excedentes de cinco minutos,
// observado o limite máximo de dez minutos diários". É uma regra tudo-ou-nada por dia: só é
// perdoado quando NENHUMA marcação isolada passa de 5min E a soma de todos os desvios do dia não
// passa de 10min — se qualquer uma das duas condições falhar, a tolerância cai por inteiro e
// todas as marcações contam pelo horário real batido, mesmo as que isoladamente ficaram dentro
// de 5min.
export const TOLERANCIA_POR_MARCACAO_MIN = 5
// Teto diário somado dos desvios tolerados (mesmo art. 58 §1º). Usado tanto como a soma máxima
// no modelo por marcação quanto, isoladamente, no modelo alternativo (total do dia) usado quando
// não há entrada/saída prevista cadastradas.
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
   oferecido para estagiários, EXCETO na exceção do art. 10 §2º: estágio de curso
   que alterna teoria e prática pode ter jornada de até 40h semanais (8h/dia) nos
   períodos sem aula presencial, desde que previsto no projeto pedagógico do curso
   — daí o parâmetro comprovanteAlternancia, marcado manualmente no cadastro
   quando o escritório tiver essa comprovação. */
export function jornadasDisponiveis(vinculo, comprovanteAlternancia = false) {
  if (vinculo !== "estagiario") return JORNADAS_PRESETS
  return comprovanteAlternancia ? JORNADAS_PRESETS : JORNADAS_PRESETS.filter((j) => j.horasDiarias <= 6)
}

/* Limite semanal do estágio em minutos (art. 10 Lei 11.788/2008): 30h/semana no regime normal,
   ou 40h/semana na exceção do §2º (curso com alternância comprovada). Não estagiário não tem
   limite específico daqui (a CLT trata separadamente, art. 59). */
export function limiteSemanalEstagioMinutos(employee) {
  if (employee?.vinculo !== "estagiario") return null
  const preset = getJornadaPreset(employee?.horasDiarias)
  const horasSemanais = preset ? preset.horasSemanais : Math.round((Number(employee?.horasDiarias) || 0) * 5)
  return horasSemanais * 60
}

/* Para estagiários com jornada de 4h, 5h ou 6h/dia, o intervalo (quando o escritório cadastra
   um) é uma anotação de bom senso, mas — diferente da CLT (art. 71, que sempre exclui o
   intervalo da jornada) — a Lei do Estágio não impõe que o intervalo seja descontado da
   jornada. Por definição do escritório, esse intervalo é computado dentro das horas diárias do
   estagiário, inclusive no regime de 4h/dia (a CLT não exige intervalo pra 4h, mas se o
   escritório cadastrar um mesmo assim pro estagiário, ele não deve ser debitado). */
export function intervaloContaComoJornada(vinculo, horasDiarias) {
  const h = Number(horasDiarias) || 0
  return vinculo === "estagiario" && h >= 4 && h <= 6
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

/* Descarta os segundos de uma marcação (horário "fechado" no minuto) — usada antes de qualquer
   conta de saldo/tolerância, pra bater com o jeito que o escritório confere na mão (olhando só
   HH:MM). Os segundos continuam guardados no registro original pra fins de auditoria (extrato de
   marcações, comprovante); só o cálculo de horas ignora essa fração. */
function truncarSegundos(iso) {
  const d = new Date(iso)
  d.setSeconds(0, 0)
  return d.toISOString()
}

export function calcWorkedMinutes(punches, incluirIntervalo = false, cicloTamanho = 4) {
  const sorted = [...punches].sort((a, b) => new Date(a.time) - new Date(b.time))
  let total = 0
  for (let i = 0; i < sorted.length - 1; i++) {
    const idx = i % cicloTamanho
    // Ciclo de 2 (jornada contínua, sem intervalo): só Entrada→Saída. Ciclo de 4 (padrão):
    // Entrada→Início intervalo e Fim intervalo→Saída sempre contam; o intervalo em si (idx 1)
    // só conta pra estagiários de 5-6h, cujo intervalo é computado dentro da jornada.
    const duracao = (new Date(sorted[i + 1].time) - new Date(sorted[i].time)) / 60000
    // O segmento de intervalo (idx 1) só entra na conta quando ele conta como jornada
    // (estagiário de 4h–6h) ou quando durou mais de 15 min — Súmula 437, II, do TST: intervalo de
    // até 15 min não é descontado do tempo de trabalho.
    const conta = cicloTamanho === 2 ? idx === 0 : (idx === 0 || idx === 2 || (idx === 1 && intervaloDescontaDaJornada(duracao, incluirIntervalo)))
    if (conta) {
      total += duracao
    }
  }
  return Math.round(total)
}

/* Intervalos de até 15 minutos NÃO são descontados da jornada (Súmula 437, II, do TST — o
   intervalo nesse intervalo é apenas um battimento de passagem, não descanso efetivo). Vale pra
   qualquer vínculo: o art. 71, §1º da CLT só exige 15 min de intervalo na faixa de 4h a 6h, e é
   justamente esse intervalo-mínimo que não pode virar desconto de jornada — descontá-lo faria
   quem trabalhou 5h (07:30–12:30, com 15 min de almoço) ser creditado como 4h45. Acima de 15 min
   o desconto vale, normalmente, e continua respeitando o que foi.customizado no cadastro. */
export const INTERVALO_NAO_DESCONTADO_MIN = 15

/* O intervalo de um dia deve ser descontado da jornada? Só quando for computado dentro da jornada
   (estagiário de 4h–6h, por definição do escritório) OU quando durar mais de 15 min. */
function intervaloDescontaDaJornada(duracaoMinutos, contarDentroDaJornada) {
  if (contarDentroDaJornada) return true
  return (duracaoMinutos ?? 0) > INTERVALO_NAO_DESCONTADO_MIN
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

/* Quantas marcações o ciclo do dia espera: 2 (Entrada/Saída) quando não há intervalo
   previsto, 4 (Entrada/Início/Fim/Saída) quando há. Considera tanto o regime cheio do
   funcionário quanto um tratamento de carga reduzida NAQUELE dia (ex.: estagiário com prova
   na faculdade) — a jornada reduzida pode cair pra uma faixa que não exige mais intervalo
   (art. 71 CLT), então o ciclo daquele dia específico também cai pra 2, mesmo que o regime
   cheio do funcionário normalmente exija 4. Usada tanto no cálculo do espelho quanto no
   botão de bater ponto, pra nunca rotular uma marcação errado. */
export function cicloTamanhoParaDia(employee, treatmentsDoDia = []) {
  if (!employee) return 4
  const cargaReduzida = (treatmentsDoDia || []).find((t) => t.kind === "carga_reduzida")
  if (cargaReduzida) {
    const baseExpectedMinutes = (Number(employee?.horasDiarias) || 0) * 60
    const percentual = Number(cargaReduzida.percentualCarga) || 50
    const expectedMinutesReduzido = Math.round(baseExpectedMinutes * percentual / 100)
    return intervaloPrevistoMinutos(expectedMinutesReduzido / 60) === 0 ? 2 : 4
  }
  return intervaloEfetivoMinutos(employee) === 0 ? 2 : 4
}

/* Jornada contínua (sem intervalo, ex.: regime de 4h/dia, ou dia de carga reduzida que caiu
   pra faixa sem intervalo): o ciclo de marcação é só Entrada/Saída, 2 marcações por dia — não
   faz sentido pedir Início/Fim do intervalo de quem não tem intervalo previsto nesse dia. */
export function punchTypesForEmployee(employee, treatmentsDoDia = []) {
  if (!employee) return PUNCH_TYPES
  return cicloTamanhoParaDia(employee, treatmentsDoDia) === 2 ? ["Entrada", "Saída"] : PUNCH_TYPES
}

export function formatIntervaloPrevisto(employee) {
  const min = intervaloEfetivoMinutos(employee)
  if (min === 0) return "Sem intervalo previsto"
  const texto = min >= 60 ? `${(min / 60).toFixed(min % 60 ? 1 : 0)}h` : `${min}min`
  return intervaloContaComoJornada(employee?.vinculo, employee?.horasDiarias) ? `${texto} (computado dentro da jornada)` : texto
}

function expectedTimeOnDay(dayKey, hhmm) {
  if (!hhmm) return null
  const d = new Date(`${dayKey}T${hhmm}:00`)
  return isNaN(d.getTime()) ? null : d
}

/* Aplica a tolerância de variação de ponto (art. 58 §1º CLT) em três frentes possíveis por dia:
   entrada (contra a entrada prevista), saída (contra a saída prevista) e — quando o dia tem
   intervalo — a DURAÇÃO do intervalo (fim menos início, contra a duração esperada), não o
   horário exato em que ele aconteceu. Isso é proposital: o horário do almoço pode variar o dia
   inteiro sem problema nenhum, o que importa é se ele durou perto do esperado. Cada frente é
   avaliada de forma independente: uma frente com desvio acima de 5min nunca é perdoada, mas
   isso não invalida o perdão das outras frentes do mesmo dia que estejam dentro do limite. A
   soma dos desvios só entre as frentes que isoladamente ficam ≤5min não pode passar de 10min no
   dia — se passar, nenhuma delas é perdoada; se não passar, todas são. */
function buildDaySummaryComSchedule(dayKey, merged, employee, expectedMinutes, cicloTamanhoDia, incluirIntervalo) {
  const entradaReal = new Date(merged[0].time)
  const saidaReal = new Date(merged[merged.length - 1].time)
  const entradaPrevista = expectedTimeOnDay(dayKey, employee.entradaPrevista)
  const saidaPrevista = expectedTimeOnDay(dayKey, employee.saidaPrevista)

  const devEntrada = entradaPrevista ? (entradaReal - entradaPrevista) / 60000 : null
  const devSaida = saidaPrevista ? (saidaReal - saidaPrevista) / 60000 : null

  let duracaoReal = null
  let duracaoEsperada = null
  let devIntervalo = null
  if (cicloTamanhoDia === 4) {
    const inicioIntervaloReal = new Date(merged[1].time)
    const fimIntervaloReal = new Date(merged[2].time)
    duracaoReal = (fimIntervaloReal - inicioIntervaloReal) / 60000
    duracaoEsperada = intervaloEfetivoMinutos(employee)
    devIntervalo = duracaoReal - duracaoEsperada
  }

  // Cada frente (entrada, saída, duração do intervalo) é avaliada de forma independente: uma
  // frente com desvio acima de 5min NUNCA é perdoada, mas isso não invalida o perdão das outras
  // frentes do mesmo dia que estejam dentro do limite. A soma dos desvios só entre as frentes
  // que isoladamente ficam ≤5min ("candidatas") não pode passar de 10min no dia — se passar,
  // nenhuma das candidatas é perdoada; se não passar, todas são.
  const desvios = [devEntrada, devSaida, devIntervalo].filter((d) => d !== null)
  const somaCandidatas = desvios.reduce((acc, d) => acc + (Math.abs(d) <= TOLERANCIA_POR_MARCACAO_MIN ? Math.abs(d) : 0), 0)
  const candidatasToleradas = somaCandidatas <= TOLERANCIA_DIARIA_MIN

  const entradaTolerada = candidatasToleradas && devEntrada !== null && Math.abs(devEntrada) <= TOLERANCIA_POR_MARCACAO_MIN
  const saidaTolerada = candidatasToleradas && devSaida !== null && Math.abs(devSaida) <= TOLERANCIA_POR_MARCACAO_MIN
  const intervaloTolerado = candidatasToleradas && devIntervalo !== null && Math.abs(devIntervalo) <= TOLERANCIA_POR_MARCACAO_MIN

  const entradaCalc = entradaTolerada ? entradaPrevista : entradaReal
  const saidaCalc = saidaTolerada ? saidaPrevista : saidaReal

  // Duração do intervalo usada no cálculo: a esperada (se tolerada) ou a real batida. Pra
  // funcionário cujo intervalo conta dentro da jornada (estagiário 5-6h), a duração do intervalo
  // não desconta nada, então não entra na conta. E mesmo no cálculo por horário previsto, um
  // intervalo de até 15 min não é descontado (Súmula 437, II, do TST) — senão a faixa de 4h a 6h
  // perderia justamente os 15 min que o art. 71, §1º da CLT só exige como pausa.
  const duracaoConsiderada = incluirIntervalo ? 0 : (intervaloTolerado ? duracaoEsperada : (duracaoReal ?? 0))
  const duracaoUsada = intervaloDescontaDaJornada(duracaoConsiderada, false) ? duracaoConsiderada : 0
  const minutes = Math.round((saidaCalc - entradaCalc) / 60000 - duracaoUsada)
  const balance = minutes - expectedMinutes
  return { minutes, balance, toleranciaAplicada: entradaTolerada || saidaTolerada || intervaloTolerado }
}

/* Resolve qual regime (carga horária, horário previsto, intervalo) vale pra um funcionário num
   dia específico, considerando o histórico de trocas de regime (ex.: mudou de 6h pra 8h a
   partir de uma data). Usa a linha de "vigencias" com o vigente_desde mais recente que ainda
   seja <= o dia — sem nenhum histórico (o caso normal), cai de volta pro cadastro atual em
   "employees" sem alterar nada. Isso evita que mudar a carga horária hoje distorça o cálculo de
   dias já passados, que continuam usando o regime que valia neles. */
export function resolveEmployeeForDay(employee, vigencias, dayKey) {
  if (!employee || !vigencias || vigencias.length === 0) return employee
  const candidatas = vigencias.filter((v) => v.cpf === employee.cpf && v.vigenteDesde <= dayKey)
  if (candidatas.length === 0) return employee
  const maisRecente = candidatas.reduce((a, b) => (b.vigenteDesde > a.vigenteDesde ? b : a))
  return {
    ...employee,
    horasDiarias: maisRecente.horasDiarias ?? employee.horasDiarias,
    jornadaMensalHoras: maisRecente.jornadaMensalHoras ?? employee.jornadaMensalHoras,
    entradaPrevista: maisRecente.entradaPrevista ?? employee.entradaPrevista,
    saidaPrevista: maisRecente.saidaPrevista ?? employee.saidaPrevista,
    intervaloMinutos: maisRecente.intervaloMinutos ?? employee.intervaloMinutos,
  }
}

/* Aplica a tolerância do art. 58, §1º da CLT sobre o TOTAL do dia: compara direto o total
   trabalhado com a carga horária contratada, sem depender de horário fixo cadastrado. Usada
   como alternativa quando o funcionário não tem entrada/saída prevista configuradas (ou no
   dia de carga reduzida, onde não há um horário fixo de referência). Se a diferença for de
   até 10 minutos pra mais ou pra menos, o dia bate exatamente a carga horária. Se passar de
   10 minutos, conta a diferença inteira — não só o excedente. */
export function buildDaySummary(dayKey, punches, treatments, employee) {
  const horasDiarias = employee?.horasDiarias
  const baseExpectedMinutes = (Number(horasDiarias) || 0) * 60

  const inclusoes = treatments
    .filter((t) => t.kind === "inclusao")
    .map((t) => ({ nsr: null, type: t.tipoMarcacao, time: t.horario, incluida: true, motivo: t.motivo }))
  const merged = [...punches, ...inclusoes]
    .map((p) => ({ ...p, time: truncarSegundos(p.time) }))
    .sort((a, b) => new Date(a.time) - new Date(b.time))
  // Ciclo do dia (2 ou 4 marcações) considerando o regime cheio E um eventual tratamento de
  // carga reduzida nesse dia (a mesma função usada pelo botão de bater ponto, pra nunca
  // desalinhar os dois).
  const cicloTamanhoDia = cicloTamanhoParaDia(employee, treatments)
  const incluirIntervalo = intervaloContaComoJornada(employee?.vinculo, horasDiarias)

  // Marcação de "home office" naquele dia — não muda cálculo nenhum, só fica registrada
  // pra aparecer no espelho e na planilha (e libera o limitador de localização nesse dia).
  const homeOfficeTreatment = treatments.find((t) => t.kind === "home_office")
  const homeOfficeAplicado = Boolean(homeOfficeTreatment)
  const homeOfficeMotivo = homeOfficeTreatment?.motivo

  const falta = treatments.find((t) => t.kind === "falta")
  if (falta) {
    // Mostra na tela o que realmente foi batido — não esconde atrás da meta cheia. Se o
    // funcionário bateu ponto parcialmente (ex.: saiu mais cedo por atestado), o "trabalhado"
    // reflete isso.
    const minutesReais = merged.length > 0 && merged.length % cicloTamanhoDia === 0
      ? calcWorkedMinutes(merged, incluirIntervalo, cicloTamanhoDia)
      : 0
    const injustificada = falta.motivoCategoria === FALTA_NAO_JUSTIFICADA
    return {
      minutes: minutesReais,
      // Falta justificada (abonada, atestado etc.) credita a carga cheia no total do período —
      // é esse o efeito do abono. Falta NÃO justificada faz o oposto: desconta o dia inteiro,
      // já que não há amparo legal pra abonar.
      minutesCreditadas: injustificada ? minutesReais : baseExpectedMinutes,
      expectedMinutes: baseExpectedMinutes,
      balance: injustificada ? minutesReais - baseExpectedMinutes : 0,
      status: injustificada ? "falta_injustificada" : "abonado",
      motivo: falta.motivoCategoria + (falta.motivo ? ` — ${falta.motivo}` : ""),
      merged,
      semRegistro: false,
      toleranciaAplicada: false,
      homeOfficeAplicado, homeOfficeMotivo,
    }
  }

  // Carga reduzida (ex.: estagiário com prova na faculdade, que trabalha só metade da
  // jornada naquele dia): diferente da falta abonada, aqui o funcionário trabalha de
  // verdade — só que contra uma meta menor só naquele dia, com a mesma tolerância normal.
  const cargaReduzida = treatments.find((t) => t.kind === "carga_reduzida")
  const percentualCarga = cargaReduzida ? (Number(cargaReduzida.percentualCarga) || 50) : 100
  const expectedMinutes = Math.round(baseExpectedMinutes * percentualCarga / 100)
  const semRegistro = merged.length === 0

  if (semRegistro) {
    // não sabemos se é folga (descanso semanal) ou falta não justificada — por isso não entra
    // no cálculo de saldo, só é listado à parte para o administrador verificar manualmente.
    return {
      minutes: 0, minutesCreditadas: 0, expectedMinutes: 0, balance: 0, status: "sem_registro",
      merged: [], semRegistro: true, toleranciaAplicada: false,
      homeOfficeAplicado, homeOfficeMotivo,
    }
  }

  if (merged.length % cicloTamanhoDia !== 0) {
    // Faltou batida(s) nesse dia (ex.: sem a saída final) — calcular a hora trabalhada com o
    // ciclo incompleto daria um número enganoso, então não calcula: só sinaliza pra
    // administração completar o registro manualmente.
    return {
      minutes: 0, minutesCreditadas: 0, expectedMinutes, balance: 0, status: "incompleto",
      merged, semRegistro: false, toleranciaAplicada: false,
      homeOfficeAplicado, homeOfficeMotivo,
    }
  }

  // Usa a tolerância por marcação (comparando com entrada/saída prevista) quando o
  // funcionário tem esse horário cadastrado — é a leitura mais literal do art. 58 §1º CLT
  // ("variações no registro de ponto"). Sem entrada/saída prevista configuradas, ou em dia
  // de carga reduzida (onde não há um horário fixo de referência), cai no modelo mais
  // simples de comparar só o total do dia contra a meta.
  const hasSchedule = !cargaReduzida
    && Boolean(employee?.entradaPrevista) && Boolean(employee?.saidaPrevista) && Number(horasDiarias) > 0

  let minutes, balance, toleranciaAplicada
  if (hasSchedule) {
    ;({ minutes, balance, toleranciaAplicada } = buildDaySummaryComSchedule(
      dayKey, merged, employee, expectedMinutes, cicloTamanhoDia, incluirIntervalo
    ))
  } else {
    // "minutes" é sempre o que realmente foi trabalhado (a verdade dos pontos batidos) — a
    // tolerância do art. 58 §1º da CLT não reescreve a hora trabalhada, só decide se a
    // diferença em relação à carga horária conta ou não para o saldo/banco de horas.
    minutes = calcWorkedMinutes(merged, incluirIntervalo, cicloTamanhoDia)
    const rawBalance = minutes - expectedMinutes
    toleranciaAplicada = Math.abs(rawBalance) <= TOLERANCIA_DIARIA_MIN
    balance = toleranciaAplicada ? 0 : rawBalance
  }

  return {
    minutes, minutesCreditadas: minutes, expectedMinutes, balance, status: "normal",
    merged, semRegistro, toleranciaAplicada, intervaloComputadoNaJornada: incluirIntervalo,
    cargaReduzidaAplicada: Boolean(cargaReduzida),
    cargaReduzidaMotivo: cargaReduzida?.motivo,
    percentualCarga,
    // Estagiário trabalhando além da carga contratada não é "hora extra" — é a própria
    // jornada da Lei 11.788/2008 sendo ultrapassada, o que arrisca caracterizar vínculo
    // empregatício disfarçado (art. 3º §2º da lei). Sinaliza sempre que sobrar saldo positivo.
    riscoJornadaEstagio: employee?.vinculo === "estagiario" && balance > 0,
    // Hora extra além de 2h/dia só é permitida em casos excepcionais (art. 61 CLT) — sinaliza
    // pra revisão manual, não bloqueia o registro.
    horaExtraAcimaDoLimite: employee?.vinculo !== "estagiario" && balance > 120,
    homeOfficeAplicado, homeOfficeMotivo,
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
