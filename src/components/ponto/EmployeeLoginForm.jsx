import Card from "../ui/Card"
import Select from "../ui/Select"
import TextField from "../ui/TextField"
import Button from "../ui/Button"

export default function EmployeeLoginForm({ employees, loading, cpf, setCpf, password, setPassword, onSubmit }) {
  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-neutral-900">Entrar</h2>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
      >
        <Select label="Funcionário" value={cpf} onChange={(e) => setCpf(e.target.value)} disabled={loading}>
          <option value="">{loading ? "Carregando…" : "Selecione seu nome"}</option>
          {employees.map((e) => (
            <option key={e.cpf} value={e.cpf}>{e.nome}</option>
          ))}
        </Select>
        <TextField label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button type="submit" className="w-full">Entrar</Button>
      </form>
    </Card>
  )
}
