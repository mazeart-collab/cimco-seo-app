const DVF_KEY = 'cimco.dvf.v3'
const TTL = 7 * 24 * 3600 * 1000

const readDvf = () => {
  try {
    return JSON.parse(localStorage.getItem(DVF_KEY)) || {}
  } catch {
    return {}
  }
}

export const cachedDvf = (code) => {
  const e = readDvf()[code]
  return e && Date.now() - e.ts < TTL ? e.data : null
}

export async function fetchDvf(code) {
  const hit = cachedDvf(code)
  if (hit) return hit
  const res = await fetch(`/api/dvf?code_insee=${encodeURIComponent(code)}`)
  if (!res.ok) throw new Error('dvf ' + res.status)
  const data = await res.json()
  try {
    const all = readDvf()
    all[code] = { data, ts: Date.now() }
    localStorage.setItem(DVF_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
  return data
}

// Retourne { page } ou { fallback: true } si la clé API n'est pas configurée
export async function generate(payload) {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  let body = null
  try {
    body = await res.json()
  } catch {
    /* corps non JSON (ex. 404 en local) */
  }
  if (res.ok && body?.page) return { page: body.page }
  if (res.status === 429) return { error: body?.message || 'Limite quotidienne atteinte.' }
  return { fallback: true, reason: body?.error || 'unavailable' }
}
