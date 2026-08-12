import { useCallback, useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

/* Cada cidade/sede tem seu próprio limitador de região (geofencing), independente do
   vínculo do funcionário — um funcionário CLT e um estagiário na mesma cidade usam a
   mesma sede. */
export function useSedes() {
  const [sedes, setSedes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(() => {
    return supabase.from("sedes").select("*").order("cidade").then(({ data, error }) => {
      if (error) setError(error.message)
      else {
        setSedes(data || [])
        setError(null)
      }
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { sedes, loading, error, reload }
}
