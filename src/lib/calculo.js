export async function sha256(text) {
  try {
    const enc = new TextEncoder().encode(text)
    const buf = await crypto.subtle.digest("SHA-256", enc)
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("")
  } catch (e) {
    return null
  }
}

export function todayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}