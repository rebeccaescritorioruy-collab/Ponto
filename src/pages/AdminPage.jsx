import { useState } from "react"
import { useSession } from "../hooks/useSession"
import AdminGate from "../components/admin/AdminGate"
import AdminTabs from "../components/admin/AdminTabs"
import FuncionariosTab from "../components/admin/FuncionariosTab"
import EmpresasTab from "../components/admin/EmpresasTab"
import EspelhoTab from "../components/admin/EspelhoTab"
import TratamentoTab from "../components/admin/TratamentoTab"
import ConfiguracoesTab from "../components/admin/ConfiguracoesTab"

const TABS = [
  { key: "funcionarios", label: "Funcionários" },
  { key: "empresas", label: "Empresas" },
  { key: "espelho", label: "Espelho de ponto" },
  { key: "tratamento", label: "Faltas e ajustes" },
  { key: "config", label: "Configurações" },
]

export default function AdminPage() {
  const { adminAuthed } = useSession()
  const [tab, setTab] = useState("funcionarios")

  if (!adminAuthed) return <AdminGate />

  return (
    <div className="space-y-6">
      <AdminTabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "funcionarios" && <FuncionariosTab />}
      {tab === "empresas" && <EmpresasTab />}
      {tab === "espelho" && <EspelhoTab />}
      {tab === "tratamento" && <TratamentoTab />}
      {tab === "config" && <ConfiguracoesTab />}
    </div>
  )
}
