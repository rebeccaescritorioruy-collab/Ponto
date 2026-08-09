import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useEmployers } from "../../hooks/useEmployers"
import { formatCNPJ } from "../../lib/calculo"
import { fetchLocation, mapsLink } from "../../lib/geo"
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
  const [localizando, setLocalizando] = useState(null)

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

  async function usarLocalizacaoAtual(vinculo) {
    setLocalizando(vinculo)
    const loc = await fetchLocation()
    setLocalizando(null)
    if (loc.latitude === null) {
      setError(loc.locationError || "Não foi possível obter a localização atual.")
      return
    }
    setError(null)
    updateField(vinculo, "latitude", loc.latitude)
    updateField(vinculo, "longitude", loc.longitude)
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

      {EMPRESAS.map(({ key, label }) => {
        const emp = draft[key]
        const temLocalizacao = emp.latitude !== null && emp.latitude !== undefined
          && emp.longitude !== null && emp.longitude !== undefined
        return (
          <Card key={key}>
            <h3 className="mb-4 text-base font-semibold text-neutral-900">{label}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="Razão social" value={emp.nome || ""} onChange={(e) => updateField(key, "nome", e.target.value)} />
              <TextField label="CNPJ" value={formatCNPJ(emp.cnpj || "")} maxLength={18} onChange={(e) => updateField(key, "cnpj", e.target.value)} />
              <TextField
                label="Endereço" className="sm:col-span-2"
                value={emp.endereco || ""} onChange={(e) => updateField(key, "endereco", e.target.value)}
              />
            </div>

            <div className="mt-6 border-t border-neutral-100 pt-4">
              <h4 className="mb-1 text-sm font-semibold text-neutral-800">Bloquear ponto fora da localização</h4>
              <p className="mb-3 text-xs text-neutral-500">
                Opcional. Se ativado, o funcionário só consegue bater o ponto estando fisicamente dentro do raio
                configurado abaixo dessa localização. A localização de cada marcação é sempre registrada,
                esteja isso ativado ou não.
              </p>

              <div className="flex flex-wrap items-end gap-3">
                <Button type="button" variant="secondary" onClick={() => usarLocalizacaoAtual(key)} disabled={localizando === key}>
                  {localizando === key ? "Obtendo localização…" : "Usar minha localização atual"}
                </Button>
                {temLocalizacao ? (
                  <a href={mapsLink(emp.latitude, emp.longitude)} target="_blank" rel="noreferrer" className="text-sm text-brand-600 hover:underline">
                    Ver localização definida no mapa
                  </a>
                ) : (
                  <span className="text-sm text-neutral-500">Nenhuma localização definida ainda.</span>
                )}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <TextField
                  label="Raio de tolerância (metros)" type="number" min="10" step="10"
                  value={emp.raio_metros ?? 150}
                  onChange={(e) => updateField(key, "raio_metros", Number(e.target.value))}
                />
                <label className="flex items-center gap-2 self-end pb-2 text-sm text-neutral-700 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={Boolean(emp.bloqueio_localizacao_ativo)}
                    disabled={!temLocalizacao}
                    onChange={(e) => updateField(key, "bloqueio_localizacao_ativo", e.target.checked)}
                  />
                  Exigir que o ponto seja batido dentro dessa localização
                  {!temLocalizacao && " (defina a localização primeiro)"}
                </label>
              </div>
            </div>

            <div className="mt-4">
              <Button onClick={() => saveEmployer(key)}>Salvar</Button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
