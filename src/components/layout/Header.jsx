import { useSession } from "../../hooks/useSession"
import rmIcon from "../../assets/rm-icon.webp"

export default function Header({ view, setView }) {
  const { loggedInEmployee, logoutEmployee, adminAuthed, logoutAdmin } = useSession()

  const showEmployeeLogout = view === "ponto" && loggedInEmployee
  const showAdminLogout = view === "admin" && adminAuthed

  return (
    <header className="sticky top-0 z-10 border-b border-ink-800 bg-ink-700">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={rmIcon} alt="Ruy Molina Advocacia" className="h-9 w-9 rounded-lg object-cover" />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">Ruy Molina Advocacia</p>
            <p className="text-xs text-brand-400">Ponto Eletrônico</p>
          </div>
        </div>

        <nav className="flex items-center gap-1 rounded-lg bg-ink-800 p-1">
          {[{ key: "ponto", label: "Bater ponto" }, { key: "admin", label: "Administrador" }].map((t) => (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === t.key
                  ? "bg-brand-500 text-ink-900"
                  : "text-ink-200 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex min-w-[3rem] items-center justify-end gap-3">
          {showEmployeeLogout && (
            <>
              <span className="hidden text-sm text-ink-200 sm:inline">
                Olá, {loggedInEmployee.nome.split(" ")[0]}
              </span>
              <button
                onClick={logoutEmployee}
                className="rounded-lg border border-ink-600 px-3 py-1.5 text-sm font-medium text-ink-200 transition-colors hover:bg-ink-800 hover:text-white"
              >
                Sair
              </button>
            </>
          )}
          {showAdminLogout && (
            <button
              onClick={logoutAdmin}
              className="rounded-lg border border-ink-600 px-3 py-1.5 text-sm font-medium text-ink-200 transition-colors hover:bg-ink-800 hover:text-white"
            >
              Sair
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
