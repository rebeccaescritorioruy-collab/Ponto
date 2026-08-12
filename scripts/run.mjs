import { register } from "node:module"

register("./esm-hooks.mjs", import.meta.url)

const script = process.argv[2]
if (!script) {
  console.error("Uso: node scripts/run.mjs <script.js> [args...]")
  process.exit(1)
}
process.argv.splice(2, 1)
await import(new URL(script, import.meta.url))
