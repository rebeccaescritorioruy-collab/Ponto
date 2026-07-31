import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useEmployees } from "../../hooks/useEmployees"
import { todayKey, FALTA_MOTIVOS, PUNCH_TYPES, formatDateTime } from "../../lib/calculo"
import Card from "../ui/Card"
import Select from "../ui/Select"
import TextField from "../ui/TextField"
import Button from "../ui/Button"
import Alert from "../ui/Alert"

export default function TratamentoTab() {
  const { employees } = useEmployees()
  const [cpf, setCpf] = useState("")
  const [date, setDate] = useState(todayKey())
  const [kind, setKind] = useState("falta")
  const [motivoFalta, setMotivoFalta] = useState(FALTA_MOTIVOS[0])
  const [horario, setHorario] = useState("")
  const [tipoMarcacao, setTipoMarcacao] = useState(PUNCH_TYPES[0])
  const [motivo, setMotivo] = useState("")
  // Guarda os itens junto da chave (cpf+data) que os originou — permite derivar a lista
  // atual sem precisar de um setState síncrono dentro do efeito de busca.
  const [existingState, setExistingState] = useState({ key: "", items: [] })
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const entryKey = cpf ? `${cpf}:${date}` : ""
  const existing = existingState.key === entryKey ? existingState.items : []

  useEffect(() => {
    if (!cpf) return
    let cancelled = false
    supabase.from("treatments").select("*").eq("cpf", cpf).eq("date", date).order("criado_em")
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(error.message)
        else setExistingState({ key: entryKey, items: data || [] })
      })
    return () => { cancelled = true }
  }, [cpf, date, entryKey])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!cpf) return setError("Selecione o funcionário.")
    if (!motivo.trim()) return setError(kind === "falta" ? "Informe o motivo da falta." : "Informe o motivo da inclusão.")

    let payload
    if (kind === "falta") {
      payload = { cpf, date, kind: "falta", motivo_categoria: motivoFalta, motivo: motivo.trim() }
    } else {
      if (!horario) return setError("Informe o horário da marcação a incluir.")
      payload = {
        cpf, date, kind: "inclusao", tipo_marcacao: tipoMarcacao,
        horario: new Date(`${date}T${horario}:00`).toISOString(), motivo: motivo.trim(),
      }
    }

    const { data, error } = await supabase.from("treatments").insert(payload).select().single()
    if (error) return setError(error.message)
    setExistingState({ key: entryKey, items: [...existing, data] })
    setMotivo("")
    setHorario("")
    setError(null)
    setNotice("Anotação salva. Isso não altera nenhuma marcação já registrada pelo funcionário.")
    setTimeout(() => setNotice(null), 3000)
  }

  async function removeEntry(id) {
    const { error } = await supabase.from("treatments").delete().eq("id", id)
    if (error) return setError(error.message)
    setExistingState({ key: entryKey, items: existing.filter((t) => t.id !== id) })
  }

  return (
    <div className="space-y-6">
      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <Card>
        <h3 className="mb-4 text-base font-semibold text-neutral-900">
          Lançar falta ou inclusão de marcação
        </h3>
        <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <Select label="Funcionário" value={cpf} onChange={(e) => setCpf(e.target.value)}>
            <option value="">Selecione</option>
            {employees.map((e) => <option key={e.cpf} value={e.cpf}>{e.nome}</option>)}
          </Select>
          <TextField label="Data" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

          <Select label="Tipo de anotação" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="falta">Falta abonada</option>
            <option value="inclusao">Inclusão de marcação esquecida</option>
          </Select>

          {kind === "falta" ? (
            <Select label="Categoria" value={motivoFalta} onChange={(e) => setMotivoFalta(e.target.value)}>
              {FALTA_MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
          ) : (
            <>
              <Select label="Tipo de marcação" value={tipoMarcacao} onChange={(e) => setTipoMarcacao(e.target.value)}>
                {PUNCH_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
              <TextField label="Horário" type="time" value={horario} onChange={(e) => setHorario(e.target.value)} />
            </>
          )}

          <TextField label="Motivo / observação" className="sm:col-span-2" value={motivo} onChange={(e) => setMotivo(e.target.value)} />

          <div className="sm:col-span-2">
            <Button type="submit">Salvar anotação</Button>
          </div>
        </form>
      </Card>

      {cpf && (
        <Card>
          <h3 className="mb-4 text-base font-semibold text-neutral-900">Anotações do dia {date}</h3>
          {existing.length === 0 ? (
            <p className="text-sm text-neutral-500">Nenhuma anotação para este dia.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {existing.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div>
                    <p className="text-neutral-900">
                      {t.kind === "falta" ? `Falta: ${t.motivo_categoria}` : `Inclusão: ${t.tipo_marcacao} às ${formatDateTime(t.horario)}`}
                    </p>
                    {t.motivo && <p className="text-xs text-neutral-500">{t.motivo}</p>}
                  </div>
                  <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => removeEntry(t.id)}>Remover</Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  )
}
