// Coleta o IP público e (se autorizado) a localização GPS do dispositivo na hora de bater
// o ponto. Nunca lança erro — se alguma parte falhar (rede, permissão negada, navegador sem
// suporte), devolve o que conseguiu com o resto em branco, pra nunca travar o registro do ponto
// por causa disso.

async function fetchIp() {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)
    const res = await fetch("https://api.ipify.org?format=json", { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) return null
    const data = await res.json()
    return data.ip || null
  } catch {
    return null
  }
}

export function fetchLocation() {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve({ latitude: null, longitude: null, accuracyM: null, locationError: "Navegador sem suporte a geolocalização" })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
          // Altitude do GPS: informativa apenas — o erro típico (±10-30m) é do tamanho de
          // vários andares de prédio, então nunca deve ser usada pra bloquear ninguém, só
          // pra registro/consulta manual do admin. Costuma vir em branco em ambientes
          // internos (o celular perde sinal de satélite e cai pra localização por Wi-Fi).
          altitude: pos.coords.altitude,
          altitudeAccuracyM: pos.coords.altitudeAccuracy,
          locationError: null,
        })
      },
      (err) => {
        resolve({
          latitude: null, longitude: null, accuracyM: null,
          altitude: null, altitudeAccuracyM: null,
          locationError: err.message || "Localização não autorizada",
        })
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
    )
  })
}

/** Coleta IP e localização em paralelo. Sempre resolve, nunca rejeita. */
export async function collectPunchOrigin() {
  const [ip, location] = await Promise.all([fetchIp(), fetchLocation()])
  return { ip, ...location }
}

/** Altitude é só informativa (ver nota em fetchLocation) — nunca usar pra decisão, só exibição. */
export function formatAltitude(altitude) {
  if (altitude === null || altitude === undefined) return null
  return `~${Math.round(altitude)}m de altitude`
}

export function mapsLink(latitude, longitude) {
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) return null
  return `https://www.google.com/maps?q=${latitude},${longitude}`
}

/** Distância em metros entre duas coordenadas (fórmula de Haversine). */
export function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
