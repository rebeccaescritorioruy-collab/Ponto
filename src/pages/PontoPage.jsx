import { useCallback, useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { useSession } from "../hooks/useSession"
import { useEmployers } from "../hooks/useEmployers"
import { todayKey, sha256, punchTypesForEmployee, empresaDoVinculo } from "../lib/calculo"
import { buildComprovanteText, downloadComprovanteTexto, downloadComprovanteXLSX } from "../lib/export"
import EmployeeLoginForm from "../components/ponto/EmployeeLoginForm"
import ClockPunchCard from "../components/ponto/ClockPunchCard"
import ComprovanteCard from "../components/ponto/ComprovanteCard"
import ChangePasswordForm from "../components/ponto/ChangePasswordForm"
import Alert from "../components/ui/Alert"

export default function PontoPage() {
  const {
    activeEmployees, employeesLoading, loggedInEmployee, employeeError, setEmployeeError,
    loginEmployee, changeOwnPassword,
  } = useSession()
  const { employers } = useEmployers()

  const [loginCpf, setLoginCpf] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [punchesState, setPunchesState] = useState({ cpf: null, items: [] })
  const [lastReceipt, setLastReceipt] = useState(null)
  const [comprovanteStatus, setComprovanteStatus] = useState(null)
  const [stamping, setStamping] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [notice, setNotice] = useState(null)

  const punches = loggedInEmployee && punchesState.cpf === loggedInEmployee.cpf ? punchesState.items : []

  const loadPunches = useCallback((cpf) => {
    if (!cpf) return
    supabase
      .from("punches").select("*").eq("cpf", cpf)
      .gte("time", `${todayKey()}T00:00:00`)
      .lte("time", `${todayKey()}T23:59:59`)
      .order("time", { ascending: true })
      .then(({ data, error }) => {
        if (!error) setPunchesState({ cpf, items: data || [] })
      })
  }, [])

  // Busca as marcações de hoje sempre que o funcionário logado muda — efeito de
  // sincronização com o Supabase (fonte externa), não um espelhamento de estado local.
  useEffect(() => {
    loadPunches(loggedInEmployee?.cpf)
  }, [loggedInEmployee, loadPunches])

  // Zera o comprovante/senha/troca-de-senha quando o funcionário logado muda. Ajuste de
  // estado durante a renderização (guardado por comparação), em vez de efeito, seguindo o
  // padrão recomendado para "resetar estado quando uma dependência muda".
  const [syncedEmployeeCpf, setSyncedEmployeeCpf] = useState(loggedInEmployee?.cpf ?? null)
  if ((loggedInEmployee?.cpf ?? null) !== syncedEmployeeCpf) {
    setSyncedEmployeeCpf(loggedInEmployee?.cpf ?? null)
    setLastReceipt(null)
    setComprovanteStatus(null)
    if (!loggedInEmployee) {
      setLoginPassword("")
      setShowChangePassword(false)
    }
  }

  async function handleLogin() {
    const ok = await loginEmployee(loginCpf, loginPassword)
    if (ok) setLoginPassword("")
  }

  async function handlePunch() {
    if (!loggedInEmployee || stamping) return
    setStamping(true)
    setEmployeeError(null)
    try {
      const { data: counter } = await supabase.from("nsr_counter").select("*").single()
      const nextNsr = (counter?.valor || 0) + 1
      const tipos = punchTypesForEmployee(loggedInEmployee)
      const nextType = tipos[punches.length % tipos.length]
      const time = new Date().toISOString()
      const hash = await sha256(`${nextNsr}|${loggedInEmployee.cpf}|${nextType}|${time}`)
      const { data: inserted, error: insertError } = await supabase
        .from("punches")
        .insert({ cpf: loggedInEmployee.cpf, nsr: nextNsr, type: nextType, time, hash })
        .select()
        .single()
      if (insertError) throw insertError
      // upsert (não update) para recriar a linha caso o contador tenha sido apagado num reset geral
      await supabase.from("nsr_counter").upsert({ id: 1, valor: nextNsr })
      setPunchesState({ cpf: loggedInEmployee.cpf, items: [...punches, inserted] })
      setLastReceipt(inserted)
      setComprovanteStatus(null)
    } catch {
      setEmployeeError("Não foi possível registrar o ponto. Tente novamente.")
    }
    setTimeout(() => setStamping(false), 450)
  }

  async function handleChangePassword(newPassword, newPasswordConfirm) {
    if (newPassword.length < 4) return setEmployeeError("A senha deve ter ao menos 4 caracteres.")
    if (newPassword !== newPasswordConfirm) return setEmployeeError("As senhas não coincidem.")
    const ok = await changeOwnPassword(newPassword)
    if (ok) {
      setShowChangePassword(false)
      setNotice("Senha alterada.")
      setTimeout(() => setNotice(null), 2500)
    }
  }

  const empresa = loggedInEmployee ? empresaDoVinculo(employers, loggedInEmployee.vinculo) : null

  async function handleCopyComprovante() {
    if (!lastReceipt || !loggedInEmployee) return
    const texto = buildComprovanteText(lastReceipt, loggedInEmployee, empresa)
    try {
      await navigator.clipboard.writeText(texto)
      setComprovanteStatus("Texto do comprovante copiado. Cole num e-mail ou mensagem para enviar.")
    } catch {
      setComprovanteStatus("Não foi possível copiar automaticamente. Selecione o texto do comprovante manualmente.")
    }
  }

  function handleDownloadComprovante() {
    if (!lastReceipt || !loggedInEmployee) return
    const filename = downloadComprovanteTexto(lastReceipt, loggedInEmployee, empresa)
    setComprovanteStatus(`Baixando ${filename}. Se o download não começou sozinho, use "Copiar texto" e cole num arquivo.`)
  }

  function handleDownloadComprovanteXLSX() {
    if (!lastReceipt || !loggedInEmployee) return
    const filename = downloadComprovanteXLSX(lastReceipt, loggedInEmployee, empresa)
    setComprovanteStatus(`Baixando ${filename}.`)
  }

  if (!loggedInEmployee) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        {employeeError && <Alert tone="error">{employeeError}</Alert>}
        <EmployeeLoginForm
          employees={activeEmployees}
          loading={employeesLoading}
          cpf={loginCpf}
          setCpf={setLoginCpf}
          password={loginPassword}
          setPassword={setLoginPassword}
          onSubmit={handleLogin}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {employeeError && <Alert tone="error">{employeeError}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}
      <ClockPunchCard
        employee={loggedInEmployee}
        punches={punches}
        onPunch={handlePunch}
        stamping={stamping}
        onToggleChangePassword={() => setShowChangePassword((v) => !v)}
      />
      {lastReceipt && (
        <ComprovanteCard
          receipt={lastReceipt}
          status={comprovanteStatus}
          onCopy={handleCopyComprovante}
          onDownload={handleDownloadComprovante}
          onDownloadXLSX={handleDownloadComprovanteXLSX}
        />
      )}
      {showChangePassword && (
        <ChangePasswordForm onSubmit={handleChangePassword} onCancel={() => setShowChangePassword(false)} />
      )}
    </div>
  )
}
