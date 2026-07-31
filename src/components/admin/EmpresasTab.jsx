import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useEmployers } from "../../hooks/useEmployers"
import { formatCNPJ } from "../../lib/calculo"
import Card from "../ui/Card"
import TextField from "../ui/TextField"
import Button from "../ui/Button"
import Alert from "../ui/Alert"

const EMPRESAS = [
  { key: "clt", label: "Empresa dos funcionários celetistas" },
  { key: "estagiario", label: "Empresa dos estagiários" },
]

export default function EmpresasTab() {
  const { employers, reload } = useEmployers()
  const [draft, setDraft] = useState(employers)
  const [syncedEmployers, setSyncedEmployers] = useState(employers)
  const [notice, setNotice] = useState(null)
  const [error, setError] = useState(null)

  // Recarrega o rascunho quando os dados vêm do Supabase (só muda de referência quando o
  // fetch inicial ou um reload() completam) — ajuste de estado durante a renderização em vez
  // de um efeito, conforme o padrão recomendado para sincronizar estado a partir de props.
  if (employers !== syncedEmployers) {
    setSyncedEmployers(employers)
    setDraft(employers)
  }

  function updateField(vinculo, field, value) {
    setDraft({ ...draft, [vinculo]: { ...draft[vinculo], [field]: value } })
  }

  async function saveEmployer(vinculo) {
    const { error } = await supabase.from("employers").upsert(draft[vinculo])
    if (error) return setError(error.message)
    setError(null)
    setNotice(`Empresa (${vinculo === "clt" ? "celetistas" : "estagiários"}) salva.`)
    setTimeout(() => setNotice(null), 2500)
    reload()
  }

  return (
    <div className="space-y-6">
      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      {EMPRESAS.map(({ key, label }) => (
        <Card key={key}>
          <h3 className="mb-4 text-base font-semibold text-neutral-900">{label}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Razão social" value={draft[key].nome || ""} onChange={(e) => updateField(key, "nome", e.target.value)} />
            <TextField label="CNPJ" value={formatCNPJ(draft[key].cnpj || "")} maxLength={18} onChange={(e) => updateField(key, "cnpj", e.target.value)} />
            <TextField
              label="Endereço" className="sm:col-span-2"
              value={draft[key].endereco || ""} onChange={(e) => updateField(key, "endereco", e.target.value)}
            />
          </div>
          <div className="mt-4">
            <Button onClick={() => saveEmployer(key)}>Salvar</Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
