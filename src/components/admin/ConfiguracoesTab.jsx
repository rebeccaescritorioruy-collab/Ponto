import { useState } from "react"
import { supabase } from "../../lib/supabase"
import Card from "../ui/Card"
import TextField from "../ui/TextField"
import Button from "../ui/Button"
import Alert from "../ui/Alert"

// Ordem importa: tabelas com referência a employees.cpf (treatments) precisam ser
// apagadas antes de employees, senão a exclusão viola a foreign key.
const RESET_TABLES = [
  { table: "treatments", column: "id" },
  { table: "punches", column: "id" },
  { table: "employees", column: "cpf" },
  { table: "employers", column: "vinculo" },
  { table: "admin_pin", column: "id" },
  { table: "nsr_counter", column: "id" },
]

export default function ConfiguracoesTab() {
  const [confirmText, setConfirmText] = useState("")
  const [inProgress, setInProgress] = useState(false)
  const [error, setError] = useState(null)

  async function handleReset() {
    if (confirmText !== "RESETAR") return
    if (!window.confirm("Isso vai apagar PERMANENTEMENTE todos os funcionários, senhas, marcações de ponto, faltas/ajustes e configurações. Não pode ser desfeito. Confirma?")) return
    setInProgress(true)
    setError(null)
    try {
      for (const { table, column } of RESET_TABLES) {
        const { error } = await supabase.from(table).delete().not(column, "is", null)
        if (error) throw error
      }
      window.location.reload()
    } catch {
      setError("Não foi possível resetar todos os dados. Tente novamente.")
      setInProgress(false)
    }
  }

  return (
    <Card className="border-red-200">
      <h3 className="mb-2 text-base font-semibold text-red-700">Zona de perigo</h3>
      <p className="mb-4 text-sm text-neutral-600">
        Apaga permanentemente todos os funcionários, senhas, marcações de ponto, faltas/ajustes e
        configurações. Esta ação não pode ser desfeita.
      </p>
      {error && (
        <div className="mb-3">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <TextField label='Digite "RESETAR" para confirmar' value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
        <Button variant="danger" disabled={confirmText !== "RESETAR" || inProgress} onClick={handleReset}>
          {inProgress ? "Resetando…" : "Resetar tudo"}
        </Button>
      </div>
    </Card>
  )
}
