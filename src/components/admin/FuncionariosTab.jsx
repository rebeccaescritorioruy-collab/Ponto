import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useEmployees } from "../../hooks/useEmployees"
import {
  sha256, formatCPF, VINCULOS, vinculoLabel, jornadasDisponiveis, getJornadaPreset, formatRegimeResumo,
  intervaloPrevistoMinutos, formatIntervaloPrevisto,
} from "../../lib/calculo"
import Card from "../ui/Card"
import TextField from "../ui/TextField"
import Select from "../ui/Select"
import Button from "../ui/Button"
import Alert from "../ui/Alert"

function emptyEmpForm() {
  return {
    cpf: "", nome: "", matricula: "", cargo: "", ctps: "", lotacao: "", admissao: "", horario: "",
    vinculo: "clt", horasDiarias: "8", jornadaMensalHoras: "200", comprovanteAlternancia: false,
    entradaPrevista: "", saidaPrevista: "", intervaloMinutos: "", senha: "", ativo: true,
  }
}

export default function FuncionariosTab() {
  const { employees, loading, reload, toRow } = useEmployees()
  const [empForm, setEmpForm] = useState(emptyEmpForm())
  const [editingCpf, setEditingCpf] = useState(null)
  const [resetPwCpf, setResetPwCpf] = useState(null)
  const [resetPwValue, setResetPwValue] = useState("")
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  function flashNotice(msg) {
    setNotice(msg)
    setTimeout(() => setNotice(null), 2500)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const cpfDigits = empForm.cpf.replace(/\D/g, "")
    if (cpfDigits.length !== 11) return setError("Informe um CPF válido (11 dígitos).")
    if (!empForm.nome.trim()) return setError("Informe o nome completo.")
    if (!editingCpf && empForm.senha.length < 4) return setError("Defina uma senha de acesso com ao menos 4 caracteres.")

    let passwordHash = null
    if (editingCpf) {
      const existing = employees.find((e) => e.cpf === editingCpf)
      passwordHash = existing?.passwordHash || null
    }
    if (empForm.senha) passwordHash = await sha256(empForm.senha)

    const record = toRow({ ...empForm, cpf: cpfDigits, passwordHash })
    const { error: upsertError } = await supabase.from("employees").upsert(record)
    if (upsertError) return setError(upsertError.message)

    setEmpForm(emptyEmpForm())
    setEditingCpf(null)
    setError(null)
    flashNotice(editingCpf ? "Cadastro atualizado." : "Funcionário cadastrado.")
    reload()
  }

  function startEdit(emp) {
    setEmpForm({
      ...emptyEmpForm(), ...emp, senha: "",
      intervaloMinutos: emp.intervaloMinutos === null || emp.intervaloMinutos === undefined ? "" : String(emp.intervaloMinutos),
    })
    setEditingCpf(emp.cpf)
  }

  async function toggleActive(emp) {
    const { error } = await supabase.from("employees").update({ ativo: !emp.ativo }).eq("cpf", emp.cpf)
    if (error) setError(error.message)
    else reload()
  }

  async function submitResetPassword() {
    if (resetPwValue.length < 4) return setError("A nova senha deve ter ao menos 4 caracteres.")
    const hash = await sha256(resetPwValue)
    const { error } = await supabase.from("employees").update({ password_hash: hash }).eq("cpf", resetPwCpf)
    if (error) return setError(error.message)
    setResetPwCpf(null)
    setResetPwValue("")
    flashNotice("Senha redefinida.")
  }

  const disponiveis = jornadasDisponiveis(empForm.vinculo, empForm.comprovanteAlternancia)

  return (
    <div className="space-y-6">
      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <Card>
        <h3 className="mb-4 text-base font-semibold text-neutral-900">
          {editingCpf ? "Editar funcionário" : "Cadastrar funcionário"}
        </h3>
        <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <TextField label="Nome completo *" value={empForm.nome} onChange={(e) => setEmpForm({ ...empForm, nome: e.target.value })} />
          <TextField
            label="CPF *" value={formatCPF(empForm.cpf)} maxLength={14} disabled={!!editingCpf}
            onChange={(e) => setEmpForm({ ...empForm, cpf: e.target.value })}
          />

          <Select
            label="Vínculo" value={empForm.vinculo}
            onChange={(e) => {
              const novoVinculo = e.target.value
              const disp = jornadasDisponiveis(novoVinculo, empForm.comprovanteAlternancia)
              const aindaValido = disp.some((j) => String(j.horasDiarias) === String(empForm.horasDiarias))
              setEmpForm({
                ...empForm, vinculo: novoVinculo,
                horasDiarias: aindaValido ? empForm.horasDiarias : "",
                jornadaMensalHoras: aindaValido ? empForm.jornadaMensalHoras : "",
              })
            }}
          >
            {VINCULOS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
          </Select>

          {empForm.vinculo === "estagiario" && (
            <label className="flex items-center gap-2 text-sm text-neutral-700 sm:col-span-2">
              <input
                type="checkbox"
                checked={empForm.comprovanteAlternancia}
                onChange={(e) => {
                  const checked = e.target.checked
                  const disp = jornadasDisponiveis(empForm.vinculo, checked)
                  const aindaValido = disp.some((j) => String(j.horasDiarias) === String(empForm.horasDiarias))
                  setEmpForm({
                    ...empForm, comprovanteAlternancia: checked,
                    horasDiarias: aindaValido ? empForm.horasDiarias : "",
                    jornadaMensalHoras: aindaValido ? empForm.jornadaMensalHoras : "",
                  })
                }}
              />
              Curso com alternância teoria/prática comprovada (art. 10 §2º da Lei 11.788/2008) — libera jornada de até 8h/dia
            </label>
          )}

          <TextField label="Matrícula" value={empForm.matricula} onChange={(e) => setEmpForm({ ...empForm, matricula: e.target.value })} />
          <TextField label="Cargo / função" value={empForm.cargo} onChange={(e) => setEmpForm({ ...empForm, cargo: e.target.value })} />
          <TextField label="CTPS" placeholder="ex.: 00007033955/08474" value={empForm.ctps} onChange={(e) => setEmpForm({ ...empForm, ctps: e.target.value })} />
          <TextField label="Lotação / unidade" placeholder="ex.: 001 João Pessoa" value={empForm.lotacao} onChange={(e) => setEmpForm({ ...empForm, lotacao: e.target.value })} />
          <TextField label="Data de admissão" type="date" value={empForm.admissao} onChange={(e) => setEmpForm({ ...empForm, admissao: e.target.value })} />
          <TextField
            label="Horário contratual (descritivo)" placeholder="ex.: 08h–12h / 13h–18h"
            value={empForm.horario} onChange={(e) => setEmpForm({ ...empForm, horario: e.target.value })}
          />

          <Select
            label="Regime de jornada" value={empForm.horasDiarias}
            onChange={(e) => {
              const preset = getJornadaPreset(e.target.value)
              setEmpForm({
                ...empForm, horasDiarias: e.target.value, jornadaMensalHoras: preset ? String(preset.horasMensais) : "",
                intervaloMinutos: String(intervaloPrevistoMinutos(e.target.value)),
              })
            }}
          >
            <option value="">Selecione</option>
            {disponiveis.map((j) => (
              <option key={j.horasDiarias} value={j.horasDiarias}>
                {j.horasDiarias}h/dia · {j.horasSemanais}h/semana · {j.horasMensais}h/mês
              </option>
            ))}
          </Select>

          <TextField label="Entrada prevista" type="time" value={empForm.entradaPrevista} onChange={(e) => setEmpForm({ ...empForm, entradaPrevista: e.target.value })} />
          <TextField label="Saída prevista" type="time" value={empForm.saidaPrevista} onChange={(e) => setEmpForm({ ...empForm, saidaPrevista: e.target.value })} />

          <TextField
            label="Duração do intervalo (minutos)" type="number" min="0" step="5"
            placeholder={`Mínimo legal: ${intervaloPrevistoMinutos(empForm.horasDiarias)} min`}
            value={empForm.intervaloMinutos}
            onChange={(e) => setEmpForm({ ...empForm, intervaloMinutos: e.target.value })}
          />

          <TextField
            label={editingCpf ? "Nova senha (deixe em branco para manter)" : "Senha de acesso *"} type="password"
            value={empForm.senha} onChange={(e) => setEmpForm({ ...empForm, senha: e.target.value })}
          />
          <p className="text-xs text-neutral-500 sm:col-span-2">* Campos obrigatórios. Os demais podem ser preenchidos depois.</p>

          <div className="flex gap-2 pt-2 sm:col-span-2">
            <Button type="submit">{editingCpf ? "Salvar alterações" : "Cadastrar"}</Button>
            {editingCpf && (
              <Button type="button" variant="secondary" onClick={() => { setEmpForm(emptyEmpForm()); setEditingCpf(null) }}>
                Cancelar edição
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card>
        <h3 className="mb-4 text-base font-semibold text-neutral-900">Equipe cadastrada</h3>
        {loading ? (
          <p className="text-sm text-neutral-500">Carregando…</p>
        ) : employees.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhum funcionário cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500">
                  <th className="py-2 pr-4 font-medium">Nome</th>
                  <th className="py-2 pr-4 font-medium">CPF</th>
                  <th className="py-2 pr-4 font-medium">Vínculo</th>
                  <th className="py-2 pr-4 font-medium">Cargo</th>
                  <th className="py-2 pr-4 font-medium">Jornada</th>
                  <th className="py-2 pr-4 font-medium">Intervalo</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {employees.map((e) => (
                  <tr key={e.cpf}>
                    <td className="py-2 pr-4 text-neutral-900">{e.nome}</td>
                    <td className="py-2 pr-4 text-neutral-600">{formatCPF(e.cpf)}</td>
                    <td className="py-2 pr-4 text-neutral-600">{vinculoLabel(e.vinculo)}</td>
                    <td className="py-2 pr-4 text-neutral-600">{e.cargo}</td>
                    <td className="py-2 pr-4 text-neutral-600">{formatRegimeResumo(e.horasDiarias, e.jornadaMensalHoras)}</td>
                    <td className="py-2 pr-4 text-neutral-600">{formatIntervaloPrevisto(e)}</td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${e.ativo ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>
                        {e.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => startEdit(e)}>Editar</Button>
                        <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => toggleActive(e)}>{e.ativo ? "Desativar" : "Reativar"}</Button>
                        <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setResetPwCpf(e.cpf)}>Redefinir senha</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {resetPwCpf && (
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <TextField label="Nova senha" type="password" value={resetPwValue} onChange={(e) => setResetPwValue(e.target.value)} />
            <Button onClick={submitResetPassword}>Confirmar</Button>
            <Button variant="secondary" onClick={() => { setResetPwCpf(null); setResetPwValue("") }}>Cancelar</Button>
          </div>
        )}
      </Card>
    </div>
  )
}
