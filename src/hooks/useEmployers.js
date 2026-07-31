import { useCallback, useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

function empty(vinculo) {
  return { vinculo, nome: "", cnpj: "", endereco: "" }
}

/* Estagiários e celetistas são vinculados a empresas diferentes — esta hook mantém as
   duas empresas ("clt" e "estagiario") carregadas da tabela `employers`. */
export function useEmployers() {
  const [employers, setEmployers] = useState({ clt: empty("clt"), estagiario: empty("estagiario") })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(() => {
    return supabase.from("employers").select("*").then(({ data, error }) => {
      if (error) {
        setError(error.message)
      } else {
        const found = { clt: empty("clt"), estagiario: empty("estagiario") }
        ;(data || []).forEach((row) => {
          found[row.vinculo] = row
        })
        setEmployers(found)
        setError(null)
      }
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { employers, loading, error, reload }
}
