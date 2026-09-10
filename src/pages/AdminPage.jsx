import { useState } from "react"
import { useSession } from "../hooks/useSession"
import AdminGate from "../components/admin/AdminGate"
import AdminTabs from "../components/admin/AdminTabs"
import FuncionariosTab from "../components/admin/FuncionariosTab"
import EmpresasTab from "../components/admin/EmpresasTab"
import SedesTab from "../components/admin/SedesTab"
import EspelhoTab from "../components/admin/EspelhoTab"
import RelatorioMensalTab from "../components/admin/RelatorioMensalTab"
import TratamentoTab from "../components/admin/TratamentoTab"
import ConfiguracoesTab from "../components/admin/ConfiguracoesTab"

const TABS = [
  { key: "funcionarios", label: "Funcionários" },
  { key: "empresas", label: "Empresas" },
  { key: "sedes", label: "Sedes" },
  { key: "espelho", label: "Espelho de ponto" },
  { key: "relatorio", label: "Relatório mensal" },
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
      {tab === "sedes" && <SedesTab />}
      {tab === "espelho" && <EspelhoTab />}
      {tab === "relatorio" && <RelatorioMensalTab />}
      {tab === "tratamento" && <TratamentoTab />}
      {tab === "config" && <ConfiguracoesTab />}
    </div>
  )
}
