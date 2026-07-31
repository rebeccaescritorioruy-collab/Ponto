import { useState } from "react"
import { useSession } from "../../hooks/useSession"
import Card from "../ui/Card"
import TextField from "../ui/TextField"
import Button from "../ui/Button"
import Alert from "../ui/Alert"

export default function AdminGate() {
  const { pinExists, adminError, createAdminPin, loginAdmin } = useSession()
  const [pin, setPin] = useState("")
  const [confirm, setConfirm] = useState("")

  if (pinExists === null) {
    return <p className="text-sm text-neutral-500">Carregando…</p>
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!pinExists) await createAdminPin(pin, confirm)
    else await loginAdmin(pin)
    setPin("")
    setConfirm("")
  }

  return (
    <div className="mx-auto max-w-sm">
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">
          {pinExists ? "Área do administrador" : "Criar PIN de administrador"}
        </h2>
        {adminError && (
          <div className="mb-3">
            <Alert tone="error">{adminError}</Alert>
          </div>
        )}
        <form className="space-y-3" onSubmit={handleSubmit}>
          <TextField label={pinExists ? "PIN" : "Novo PIN"} type="password" value={pin} onChange={(e) => setPin(e.target.value)} />
          {!pinExists && (
            <TextField label="Confirmar PIN" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          )}
          <Button type="submit" className="w-full">{pinExists ? "Entrar" : "Criar PIN"}</Button>
        </form>
      </Card>
    </div>
  )
}
