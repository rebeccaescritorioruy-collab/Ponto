// Troca o PIN/senha do admin direto no Supabase, sem precisar abrir o app.
//
// Uso:
//   npm run change-admin-pin -- "NovaSenha123"
//
// Lê as credenciais do Supabase do .env.local (mesmo arquivo que o app usa).
import fs from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"

const envPath = path.join(process.cwd(), ".env.local")
if (!fs.existsSync(envPath)) {
  console.error("Não encontrei o .env.local na raiz do projeto — rode esse script de dentro da pasta ponto-eletronico.")
  process.exit(1)
}
const envText = fs.readFileSync(envPath, "utf-8")
const env = Object.fromEntries(
  envText.split("\n").filter((l) => l.includes("=")).map((l) => {
    const idx = l.indexOf("=")
    return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
  })
)

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

async function sha256(text) {
  const enc = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest("SHA-256", enc)
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("")
}

const novaSenha = process.argv[2]
if (!novaSenha) {
  console.error('Uso: npm run change-admin-pin -- "NovaSenha123"')
  process.exit(1)
}
if (novaSenha.length < 4) {
  console.error("O PIN precisa ter ao menos 4 caracteres.")
  process.exit(1)
}

const hash = await sha256(novaSenha)
const { error } = await supabase.from("admin_pin").upsert({ id: 1, hash })
if (error) {
  console.error("Erro:", error.message)
  process.exit(1)
}
console.log("✅ PIN de admin atualizado com sucesso.")
