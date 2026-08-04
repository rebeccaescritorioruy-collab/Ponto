import { useCallback, useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

function mapRow(row) {
  return {
    cpf: row.cpf,
    nome: row.nome,
    matricula: row.matricula,
    cargo: row.cargo,
    ctps: row.ctps,
    lotacao: row.lotacao,
    admissao: row.admissao,
    horario: row.horario,
    vinculo: row.vinculo || "clt",
    horasDiarias: row.horas_diarias,
    jornadaMensalHoras: row.jornada_mensal_horas,
    entradaPrevista: row.entrada_prevista,
    saidaPrevista: row.saida_prevista,
    intervaloMinutos: row.intervalo_minutos,
    comprovanteAlternancia: row.comprovante_alternancia || false,
    ativo: row.ativo,
    passwordHash: row.password_hash,
  }
}

// Postgres rejeita "" como valor de date/time (colunas tipadas) — só aceita um valor válido ou
// null. Como agora esses campos são opcionais no cadastro, precisam virar null quando vazios.
function emptyToNull(v) {
  return v === "" || v === undefined ? null : v
}

function toRow(emp) {
  return {
    cpf: emp.cpf,
    nome: emp.nome,
    matricula: emp.matricula,
    cargo: emp.cargo,
    ctps: emp.ctps,
    lotacao: emp.lotacao,
    admissao: emptyToNull(emp.admissao),
    horario: emp.horario,
    vinculo: emp.vinculo || "clt",
    horas_diarias: emp.horasDiarias,
    jornada_mensal_horas: emp.jornadaMensalHoras,
    entrada_prevista: emptyToNull(emp.entradaPrevista),
    saida_prevista: emptyToNull(emp.saidaPrevista),
    intervalo_minutos: emptyToNull(emp.intervaloMinutos),
    comprovante_alternancia: Boolean(emp.comprovanteAlternancia),
    ativo: emp.ativo,
    password_hash: emp.passwordHash ?? null,
  }
}

/** Carrega e mantém a lista de funcionários, com mapeamento para o formato interno (camelCase). */
export function useEmployees({ onlyActive = false } = {}) {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(() => {
    let query = supabase.from("employees").select("*").order("nome")
    if (onlyActive) query = query.eq("ativo", true)
    return query.then(({ data, error }) => {
      if (error) setError(error.message)
      else {
        setEmployees((data || []).map(mapRow))
        setError(null)
      }
      setLoading(false)
    })
  }, [onlyActive])

  useEffect(() => {
    reload()
  }, [reload])

  return { employees, loading, error, reload, mapRow, toRow }
}
