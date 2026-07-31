import { useState, useEffect } from "react"
import { supabase } from "./lib/supabase"
import { sha256, todayKey } from "./lib/calculo"

const PUNCH_TYPES = ["Entrada", "Início do intervalo", "Fim do intervalo", "Saída"]

export default function App() {
  const [employees, setEmployees] = useState([])
  const [loginCpf, setLoginCpf] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loggedIn, setLoggedIn] = useState(null)
  const [punches, setPunches] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.from("employees").select("*").eq("ativo", true)
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setEmployees(data || [])
      })
  }, [])

  async function loadPunches(cpf) {
    const { data, error } = await supabase
      .from("punches")
      .select("*")
      .eq("cpf", cpf)
      .gte("time", `${todayKey()}T00:00:00`)
      .lte("time", `${todayKey()}T23:59:59`)
      .order("time", { ascending: true })
    if (error) setError(error.message)
    else setPunches(data || [])
  }

  async function handleLogin() {
    const emp = employees.find((e) => e.cpf === loginCpf)
    if (!emp) return setError("Selecione seu nome.")
    const hash = await sha256(loginPassword)
    if (hash !== emp.password_hash) return setError("Senha incorreta.")
    setLoggedIn(emp)
    setError(null)
    loadPunches(emp.cpf)
  }

  async function handlePunch() {
    const nextType = PUNCH_TYPES[punches.length % 4]
    const { data: counter } = await supabase.from("nsr_counter").select("*").single()
    const nextNsr = (counter?.valor || 0) + 1
    const time = new Date().toISOString()

    const { error: insertError } = await supabase.from("punches").insert({
      cpf: loggedIn.cpf, nsr: nextNsr, type: nextType, time,
    })
    if (insertError) return setError(insertError.message)

    await supabase.from("nsr_counter").update({ valor: nextNsr }).eq("id", 1)
    loadPunches(loggedIn.cpf)
  }

  if (!loggedIn) {
    return (
      <div style={{ padding: 40, maxWidth: 400 }}>
        <h2>Entrar</h2>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <select value={loginCpf} onChange={(e) => setLoginCpf(e.target.value)}>
          <option value="">Selecione seu nome</option>
          {employees.map((e) => <option key={e.cpf} value={e.cpf}>{e.nome}</option>)}
        </select>
        <br /><br />
        <input type="password" placeholder="Senha" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
        <br /><br />
        <button onClick={handleLogin}>Entrar</button>
      </div>
    )
  }

  return (
    <div style={{ padding: 40, maxWidth: 400 }}>
      <h2>Olá, {loggedIn.nome}</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button onClick={handlePunch}>Bater Ponto</button>
      <h3>Marcações de hoje</h3>
      <ul>
        {punches.map((p) => (
          <li key={p.id}>{new Date(p.time).toLocaleTimeString("pt-BR")} — {p.type}</li>
        ))}
      </ul>
    </div>
  )
}