import { useCallback, useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { sha256 } from "../lib/calculo"
import { useEmployees } from "../hooks/useEmployees"
import { SessionContext } from "./sessionContextObject"

export function SessionProvider({ children }) {
  const { employees: activeEmployees, loading: employeesLoading, reload: reloadActiveEmployees } = useEmployees({ onlyActive: true })

  const [loggedInEmployee, setLoggedInEmployee] = useState(null)
  const [employeeError, setEmployeeError] = useState(null)

  const loginEmployee = useCallback(async (cpf, password) => {
    const emp = activeEmployees.find((e) => e.cpf === cpf)
    if (!emp) {
      setEmployeeError("Selecione seu nome.")
      return false
    }
    if (!emp.passwordHash) {
      setEmployeeError("Esse funcionário ainda não tem senha configurada. Peça ao administrador.")
      return false
    }
    const hash = await sha256(password)
    if (hash !== emp.passwordHash) {
      setEmployeeError("Senha incorreta.")
      return false
    }
    setLoggedInEmployee(emp)
    setEmployeeError(null)
    return true
  }, [activeEmployees])

  const logoutEmployee = useCallback(() => {
    setLoggedInEmployee(null)
    setEmployeeError(null)
  }, [])

  const changeOwnPassword = useCallback(async (newPassword) => {
    const hash = await sha256(newPassword)
    const { error } = await supabase.from("employees").update({ password_hash: hash }).eq("cpf", loggedInEmployee.cpf)
    if (error) {
      setEmployeeError(error.message)
      return false
    }
    setLoggedInEmployee((prev) => ({ ...prev, passwordHash: hash }))
    reloadActiveEmployees()
    return true
  }, [loggedInEmployee, reloadActiveEmployees])

  const [pinExists, setPinExists] = useState(null)
  const [adminAuthed, setAdminAuthed] = useState(false)
  const [adminError, setAdminError] = useState(null)

  useEffect(() => {
    supabase.from("admin_pin").select("*").eq("id", 1).maybeSingle()
      .then(({ data }) => setPinExists(!!data?.hash))
  }, [])

  const createAdminPin = useCallback(async (pin, confirm) => {
    if (pin.length < 4) {
      setAdminError("O PIN deve ter ao menos 4 dígitos.")
      return false
    }
    if (pin !== confirm) {
      setAdminError("Os PINs não coincidem.")
      return false
    }
    const hash = await sha256(pin)
    const { error } = await supabase.from("admin_pin").upsert({ id: 1, hash })
    if (error) {
      setAdminError(error.message)
      return false
    }
    setPinExists(true)
    setAdminAuthed(true)
    setAdminError(null)
    return true
  }, [])

  const loginAdmin = useCallback(async (pin) => {
    const { data, error } = await supabase.from("admin_pin").select("*").eq("id", 1).single()
    if (error) {
      setAdminError(error.message)
      return false
    }
    const hash = await sha256(pin)
    if (hash !== data.hash) {
      setAdminError("PIN incorreto.")
      return false
    }
    setAdminAuthed(true)
    setAdminError(null)
    return true
  }, [])

  const logoutAdmin = useCallback(() => {
    setAdminAuthed(false)
    setAdminError(null)
  }, [])

  const value = {
    activeEmployees, employeesLoading, reloadActiveEmployees,
    loggedInEmployee, employeeError, setEmployeeError, loginEmployee, logoutEmployee, changeOwnPassword,
    pinExists, adminAuthed, adminError, setAdminError, createAdminPin, loginAdmin, logoutAdmin,
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
