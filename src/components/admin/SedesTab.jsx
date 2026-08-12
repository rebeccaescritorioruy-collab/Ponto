import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useSedes } from "../../hooks/useSedes"
import { fetchLocation, mapsLink, geocodeAddress } from "../../lib/geo"
import Card from "../ui/Card"
import TextField from "../ui/TextField"
import Button from "../ui/Button"
import Alert from "../ui/Alert"
import Toast from "../ui/Toast"

function empty() {
  return { cidade: "", endereco: "", latitude: null, longitude: null, raio_metros: 150, bloqueio_localizacao_ativo: false }
}

export default function SedesTab() {
  const { sedes, reload } = useSedes()
  const [drafts, setDrafts] = useState({})
  const [syncedSedes, setSyncedSedes] = useState(sedes)
  const [novaCidade, setNovaCidade] = useState("")
  const [novoEndereco, setNovoEndereco] = useState("")
  const [localizando, setLocalizando] = useState(null)
  const [buscando, setBuscando] = useState(null)
  const [notice, setNotice] = useState(null)
  const [error, setError] = useState(null)

  // Recarrega os rascunhos quando a lista vem do Supabase — ajuste de estado durante a
  // renderização em vez de efeito, mesmo padrão usado em EmpresasTab.
  if (sedes !== syncedSedes) {
    setSyncedSedes(sedes)
    const byId = {}
    sedes.forEach((s) => { byId[s.id] = s })
    setDrafts(byId)
  }

  function updateField(id, field, value) {
    setDrafts({ ...drafts, [id]: { ...drafts[id], [field]: value } })
  }

  async function usarLocalizacaoAtual(id) {
    setLocalizando(id)
    const loc = await fetchLocation()
    setLocalizando(null)
    if (loc.latitude === null) {
      setError(loc.locationError || "Não foi possível obter a localização atual.")
      return
    }
    setError(null)
    setDrafts({
      ...drafts,
      [id]: { ...drafts[id], latitude: loc.latitude, longitude: loc.longitude },
    })
  }

  async function buscarPeloEndereco(id) {
    const endereco = drafts[id]?.endereco || ""
    setBuscando(id)
    const resultado = await geocodeAddress(endereco)
    setBuscando(null)
    if (resultado.latitude === null) {
      setError(resultado.geocodeError)
      return
    }
    setError(null)
    setDrafts({
      ...drafts,
      [id]: { ...drafts[id], latitude: resultado.latitude, longitude: resultado.longitude },
    })
    flashNotice(`Localização encontrada: ${resultado.displayName}. Confira no mapa antes de salvar.`)
  }

  async function salvarSede(id) {
    // "id" é coluna identity (gerada automaticamente) — o Postgres rejeita qualquer update
    // que a inclua, mesmo mantendo o mesmo valor.
    const semId = { ...drafts[id] }
    delete semId.id
    const { error } = await supabase.from("sedes").update(semId).eq("id", id)
    if (error) return setError(error.message)
    setError(null)
    flashNotice(
      semId.endereco
        ? `Endereço de "${drafts[id].cidade}" salvo: ${semId.endereco}`
        : `Sede "${drafts[id].cidade}" salva.`
    )
    reload()
  }

  async function excluirSede(id, cidade) {
    const { error } = await supabase.from("sedes").delete().eq("id", id)
    if (error) {
      setError(
        error.code === "23503"
          ? `Não é possível excluir "${cidade}": existem funcionários vinculados a essa cidade. Mude a cidade deles primeiro.`
          : error.message
      )
      return
    }
    setError(null)
    flashNotice(`Sede "${cidade}" excluída.`)
    reload()
  }

  function flashNotice(msg) {
    setNotice(msg)
    setTimeout(() => setNotice(null), 2500)
  }

  async function adicionarCidade(e) {
    e.preventDefault()
    if (!novaCidade.trim()) return
    const { error } = await supabase.from("sedes").insert({
      ...empty(), cidade: novaCidade.trim(), endereco: novoEndereco.trim(),
    })
    if (error) return setError(error.message)
    setError(null)
    setNovaCidade("")
    setNovoEndereco("")
    flashNotice(`Cidade "${novaCidade.trim()}" adicionada.`)
    reload()
  }

  return (
    <div className="space-y-6">
      {error && <Alert tone="error">{error}</Alert>}
      <Toast message={notice} />

      <Card>
        <h3 className="mb-1 text-base font-semibold text-neutral-900">Sedes / cidades</h3>
        <p className="mb-4 text-xs text-neutral-500">
          Cada cidade tem seu próprio limitador de localização — um funcionário CLT e um estagiário na mesma
          cidade usam o mesmo limite. Vincule a cidade de cada funcionário na aba Funcionários.
        </p>
        <form className="flex flex-wrap items-end gap-3" onSubmit={adicionarCidade}>
          <TextField label="Nova cidade" placeholder="ex.: João Pessoa" value={novaCidade} onChange={(e) => setNovaCidade(e.target.value)} />
          <TextField
            label="Endereço (rua/prédio)" placeholder="ex.: Av. Epitácio Pessoa, 1000 — Ed. Torre Norte"
            value={novoEndereco} onChange={(e) => setNovoEndereco(e.target.value)}
          />
          <Button type="submit">Adicionar cidade</Button>
        </form>
      </Card>

      {sedes.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhuma cidade cadastrada ainda.</p>
      ) : (
        sedes.map((s) => {
          const d = drafts[s.id] || s
          const temLocalizacao = d.latitude !== null && d.latitude !== undefined
            && d.longitude !== null && d.longitude !== undefined
          return (
            <Card key={s.id}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-neutral-900">{s.cidade}</h3>
                <button
                  onClick={() => excluirSede(s.id, s.cidade)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Excluir cidade
                </button>
              </div>

              <TextField
                label="Endereço (rua/prédio)" placeholder="ex.: Av. Epitácio Pessoa, 1000 — Ed. Torre Norte"
                value={d.endereco || ""} onChange={(e) => updateField(s.id, "endereco", e.target.value)}
              />

              <div className="mt-4 flex flex-wrap items-end gap-3">
                <Button
                  type="button" variant="secondary" onClick={() => buscarPeloEndereco(s.id)}
                  disabled={buscando === s.id || !(d.endereco || "").trim()}
                >
                  {buscando === s.id ? "Buscando…" : "Buscar localização pelo endereço"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => usarLocalizacaoAtual(s.id)} disabled={localizando === s.id}>
                  {localizando === s.id ? "Obtendo localização…" : "Usar minha localização atual"}
                </Button>
                {temLocalizacao && (
                  <a href={mapsLink(d.latitude, d.longitude)} target="_blank" rel="noreferrer" className="text-sm text-brand-600 hover:underline">
                    Ver no mapa
                  </a>
                )}
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                "Buscar pelo endereço" funciona de qualquer lugar (bom pra quem não pode ir até lá). "Usar minha
                localização atual" só funciona estando fisicamente no endereço. Depois de buscar, confira no mapa
                se o ponto ficou certo — se não, ajuste a latitude/longitude manualmente abaixo.
              </p>

              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  label="Latitude" type="number" step="0.000001"
                  value={d.latitude ?? ""}
                  onChange={(e) => updateField(s.id, "latitude", e.target.value === "" ? null : Number(e.target.value))}
                />
                <TextField
                  label="Longitude" type="number" step="0.000001"
                  value={d.longitude ?? ""}
                  onChange={(e) => updateField(s.id, "longitude", e.target.value === "" ? null : Number(e.target.value))}
                />
              </div>
              {!temLocalizacao && <p className="mt-1 text-xs text-neutral-500">Nenhuma localização definida ainda.</p>}

              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <TextField
                  label="Raio de tolerância (metros)" type="number" min="10" step="10"
                  value={d.raio_metros ?? 150}
                  onChange={(e) => updateField(s.id, "raio_metros", Number(e.target.value))}
                />
                <label className="flex items-center gap-2 self-end pb-2 text-sm text-neutral-700 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={Boolean(d.bloqueio_localizacao_ativo)}
                    disabled={!temLocalizacao}
                    onChange={(e) => updateField(s.id, "bloqueio_localizacao_ativo", e.target.checked)}
                  />
                  Exigir que o ponto seja batido dentro dessa localização
                  {!temLocalizacao && " (defina a localização primeiro)"}
                </label>
              </div>

              <div className="mt-4">
                <Button onClick={() => salvarSede(s.id)}>Salvar</Button>
              </div>
            </Card>
          )
        })
      )}
    </div>
  )
}
