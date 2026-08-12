// O código em src/lib/*.js importa uns aos outros sem extensão (".js"), que é o padrão do
// Vite mas não é resolvido pelo ESM puro do Node. Esse hook só complementa a resolução
// padrão tentando ".js" quando um import relativo não é encontrado — permite que os scripts
// da pasta scripts/ reaproveitem o mesmo código-fonte do app sem duplicar lógica de negócio.
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context)
  } catch (err) {
    if (err.code === "ERR_MODULE_NOT_FOUND" && (specifier.startsWith("./") || specifier.startsWith("../"))) {
      return nextResolve(`${specifier}.js`, context)
    }
    throw err
  }
}
