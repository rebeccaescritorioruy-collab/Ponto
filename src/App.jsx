import { useState } from "react"
import { SessionProvider } from "./context/SessionContext"
import Header from "./components/layout/Header"
import PontoPage from "./pages/PontoPage"
import AdminPage from "./pages/AdminPage"

export default function App() {
  const [view, setView] = useState("ponto")

  return (
    <SessionProvider>
      <div className="min-h-svh bg-white">
        <Header view={view} setView={setView} />
        <main className="mx-auto max-w-5xl px-4 py-8">
          {view === "ponto" ? <PontoPage /> : <AdminPage />}
        </main>
      </div>
    </SessionProvider>
  )
}
