import { useState } from "react"
import Card from "../ui/Card"
import TextField from "../ui/TextField"
import Button from "../ui/Button"

export default function ChangePasswordForm({ onSubmit, onCancel }) {
  const [newPassword, setNewPassword] = useState("")
  const [confirm, setConfirm] = useState("")

  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-neutral-800">Trocar senha</h3>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit(newPassword, confirm)
        }}
      >
        <TextField label="Nova senha" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <TextField label="Confirmar nova senha" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <div className="flex gap-2">
          <Button type="submit">Salvar</Button>
          <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        </div>
      </form>
    </Card>
  )
}
