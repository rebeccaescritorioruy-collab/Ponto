import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useEmployees } from "../../hooks/useEmployees"
import { todayKey, sha256, FALTA_MOTIVOS, PUNCH_TYPES, formatDateTime } from "../../lib/calculo"
import Card from "../ui/Card"
import Select from "../ui/Select"
import TextField from "../ui/TextField"
import Button from "../ui/Button"
import Alert from "../ui/Alert"

export default function TratamentoTab() {
  const { employees } = useEmployees()
  const [cpf, setCpf] = useState("")
  const [date, setDate] = useState(todayKey())
  const [motivoFalta, setMotivoFalta] = useState(FALTA_MOTIVOS[0])
  const [motivo, setMotivo] = useState("")
  // Guarda os itens junto da chave (cpf+data) que os originou — permite derivar a lista
  // atual sem precisar de um setState síncrono dentro do efeito de busca.
  const [existingState, setExistingState] = useState({ key: "", items: [] })
  const [punchesState, setPunchesState] = useState({ key: "", items: [] })
  const [editingPunchId, setEditingPunchId] = useState(null)
  const [editPunchTime, setEditPunchTime] = useState("")
  const [addType, setAddType] = useState(PUNCH_TYPES[0])
  const [addTime, setAddTime] = useState("")
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const entryKey = cpf ? `${cpf}:${date}` : ""
  const existing = existingState.key === entryKey ? existingState.items : []
  const dayPunches = punchesState.key === entryKey ? punchesState.items : []

  useEffect(() => {
    if (!cpf) return
    let cancelled = false
    Promise.all([
      supabase.from("treatments").select("*").eq("cpf", cpf).eq("date", date).order("criado_em"),
      supabase.from("punches").select("*").eq("cpf", cpf)
        .gte("time", `${date}T00:00:00`).lte("time", `${date}T23:59:59`).order("time"),
    ]).then(([treatRes, punchRes]) => {
      if (cancelled) return
      if (treatRes.error || punchRes.error) {
        setError((treatRes.error || punchRes.error).message)
        return
      }
      setExistingState({ key: entryKey, items: treatRes.data || [] })
      setPunchesState({ key: entryKey, items: punchRes.data || [] })
    })
    return () => { cancelled = true }
  }, [cpf, date, entryKey])

  async function handleSubmitFalta(e) {
    e.preventDefault()
    if (!cpf) return setError("Selecione o funcionário.")
    if (!motivo.trim()) return setError("Informe o motivo da falta.")

    const payload = { cpf, date, kind: "falta", motivo_categoria: motivoFalta, motivo: motivo.trim() }
    const { data, error } = await supabase.from("treatments").insert(payload).select().single()
    if (error) return setError(error.message)
    setExistingState({ key: entryKey, items: [...existing, data] })
    setMotivo("")
    setError(null)
    setNotice("Falta abonada salva.")
    setTimeout(() => setNotice(null), 3000)
  }

  async function removeEntry(id) {
    const { error } = await supabase.from("treatments").delete().eq("id", id)
    if (error) return setError(error.message)
    setExistingState({ key: entryKey, items: existing.filter((t) => t.id !== id) })
  }

  function startEditPunch(p) {
    const d = new Date(p.time)
    setEditingPunchId(p.id)
    setEditPunchTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`)
  }

  async function saveEditPunch(p) {
    if (!editPunchTime) return setError("Informe o novo horário.")
    const newTime = new Date(`${date}T${editPunchTime}:00`).toISOString()
    // Recalcula o hash do comprovante com o novo horário — mantém os dois consistentes
    // entre si, mesmo sabendo que isso é uma correção administrativa, não a marcação original.
    const newHash = await sha256(`${p.nsr}|${p.cpf}|${p.type}|${newTime}`)
    // .select().single() confirma que o update de fato encontrou e alterou a linha (RLS ou um
    // id incorreto fariam o update afetar 0 linhas silenciosamente, sem gerar erro).
    const { data: updated, error } = await supabase
      .from("punches").update({ time: newTime, hash: newHash }).eq("id", p.id).select().single()
    if (error) return setError(error.message)
    if (!updated) return setError("A marcação não foi encontrada para atualizar (id inexistente ou sem permissão).")
    setPunchesState({
      key: entryKey,
      items: dayPunches
        .map((x) => (x.id === p.id ? updated : x))
        .sort((a, b) => new Date(a.time) - new Date(b.time)),
    })
    setEditingPunchId(null)
    setEditPunchTime("")
    setError(null)
    setNotice(`Horário atualizado para ${editPunchTime}.`)
    setTimeout(() => setNotice(null), 2500)
  }

  async function removePunch(id) {
    const { error } = await supabase.from("punches").delete().eq("id", id)
    if (error) return setError(error.message)
    setPunchesState({ key: entryKey, items: dayPunches.filter((p) => p.id !== id) })
  }

  async function addPunch() {
    if (!cpf) return setError("Selecione o funcionário.")
    if (!addTime) return setError("Informe o horário da marcação.")
    const time = new Date(`${date}T${addTime}:00`).toISOString()

    // Já existe uma marcação desse tipo nesse dia? Edita ela em vez de duplicar — um dia só
    // pode ter uma Entrada, um Início de intervalo, um Fim de intervalo e uma Saída.
    const existingPunch = dayPunches.find((p) => p.type === addType)
    if (existingPunch) {
      const newHash = await sha256(`${existingPunch.nsr}|${cpf}|${addType}|${time}`)
      const { data: updated, error } = await supabase
        .from("punches").update({ time, hash: newHash }).eq("id", existingPunch.id).select().single()
      if (error) return setError(error.message)
      setPunchesState({
        key: entryKey,
        items: dayPunches
          .map((x) => (x.id === existingPunch.id ? updated : x))
          .sort((a, b) => new Date(a.time) - new Date(b.time)),
      })
      setAddTime("")
      setError(null)
      setNotice(`Já existia uma marcação de "${addType}" nesse dia — o horário foi atualizado para ${addTime}, sem duplicar.`)
      setTimeout(() => setNotice(null), 3500)
      return
    }

    const { data: counter } = await supabase.from("nsr_counter").select("*").single()
    const nextNsr = (counter?.valor || 0) + 1
    const hash = await sha256(`${nextNsr}|${cpf}|${addType}|${time}`)
    const { data: inserted, error } = await supabase
      .from("punches").insert({ cpf, nsr: nextNsr, type: addType, time, hash }).select().single()
    if (error) return setError(error.message)
    await supabase.from("nsr_counter").upsert({ id: 1, valor: nextNsr })
    setPunchesState({
      key: entryKey,
      items: [...dayPunches, inserted].sort((a, b) => new Date(a.time) - new Date(b.time)),
    })
    setAddTime("")
    setError(null)
    setNotice("Marcação adicionada.")
    setTimeout(() => setNotice(null), 2500)
  }

  return (
    <div className="space-y-6">
      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Funcionário" value={cpf} onChange={(e) => setCpf(e.target.value)}>
            <option value="">Selecione</option>
            {employees.map((e) => <option key={e.cpf} value={e.cpf}>{e.nome}</option>)}
          </Select>
          <TextField label="Data" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </Card>

      {cpf && (
        <Card>
          <h3 className="mb-1 text-base font-semibold text-neutral-900">Marcações batidas em {date}</h3>
          <p className="mb-4 text-xs text-neutral-500">
            Essas são as marcações reais desse funcionário nesse dia. Corrija o horário de uma marcação com
            "Editar horário", ou adicione uma nova aqui embaixo se ele esqueceu de bater o ponto.
          </p>
          {dayPunches.length === 0 ? (
            <p className="text-sm text-neutral-500">Nenhuma marcação batida pelo funcionário nesse dia.</p>
          ) : (
            <ul className="mb-4 divide-y divide-neutral-100">
              {dayPunches.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="text-neutral-900">{p.type}</span>
                  {editingPunchId === p.id ? (
                    <div className="flex items-center gap-2">
                      <TextField type="time" value={editPunchTime} onChange={(e) => setEditPunchTime(e.target.value)} className="w-28" />
                      <Button className="px-2 py-1 text-xs" onClick={() => saveEditPunch(p)}>Salvar</Button>
                      <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => { setEditingPunchId(null); setEditPunchTime("") }}>
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-neutral-600">{formatDateTime(p.time)}</span>
                      <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => startEditPunch(p)}>Editar horário</Button>
                      <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => removePunch(p.id)}>Remover</Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-end gap-2 border-t border-neutral-100 pt-4">
            <Select label="Tipo de marcação" value={addType} onChange={(e) => setAddType(e.target.value)} className="w-52">
              {PUNCH_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
            <TextField label="Horário" type="time" value={addTime} onChange={(e) => setAddTime(e.target.value)} className="w-28" />
            <Button onClick={addPunch}>Adicionar marcação</Button>
          </div>
        </Card>
      )}

      {cpf && (
        <Card>
          <h3 className="mb-1 text-base font-semibold text-neutral-900">Lançar falta abonada</h3>
          <p className="mb-4 text-xs text-neutral-500">
            Pra dias em que o funcionário não trabalhou por um motivo justificado (atestado, férias etc.) — não
            é usado pra corrigir marcação, isso é feito na lista acima.
          </p>
          <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSubmitFalta}>
            <Select label="Categoria" value={motivoFalta} onChange={(e) => setMotivoFalta(e.target.value)}>
              {FALTA_MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
            <TextField label="Motivo / observação" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            <div className="sm:col-span-2">
              <Button type="submit">Salvar falta abonada</Button>
            </div>
          </form>
        </Card>
      )}

      {cpf && existing.length > 0 && (
        <Card>
          <h3 className="mb-4 text-base font-semibold text-neutral-900">Anotações do dia {date}</h3>
          <ul className="divide-y divide-neutral-100">
            {existing.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div>
                  <p className="text-neutral-900">
                    {t.kind === "falta" ? `Falta: ${t.motivo_categoria}` : `Inclusão (legado): ${t.tipo_marcacao} às ${formatDateTime(t.horario)}`}
                  </p>
                  {t.motivo && <p className="text-xs text-neutral-500">{t.motivo}</p>}
                </div>
                <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => removeEntry(t.id)}>Remover</Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
