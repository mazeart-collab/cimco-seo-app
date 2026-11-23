import { norm } from './data'

const KEY = 'cimco.geo.v1'
const API = 'https://geo.api.gouv.fr/communes'

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}
const write = (v) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(v))
  } catch {
    /* stockage indisponible */
  }
}

export const loadGeoCache = read

async function query(params) {
  const res = await fetch(`${API}?${new URLSearchParams({ ...params, fields: 'nom,code,population', format: 'json' })}`)
  if (!res.ok) throw new Error('geo ' + res.status)
  return res.json()
}

// Retourne { code, population } ou null si la commune n'est pas trouvée. Lève une erreur si l'API est injoignable.
async function lookup(c) {
  // Code INSEE connu : requête directe
  if (c.insee) {
    const r = await fetch(`${API}/${c.insee}?${new URLSearchParams({ fields: 'nom,code,population', format: 'json' })}`)
    if (r.status === 404) return null
    if (!r.ok) throw new Error('geo ' + r.status)
    const hit = await r.json()
    return { code: hit.code, population: hit.population ?? null }
  }
  const target = norm(c.name)
  let list = await query({ nom: c.name, codeDepartement: c.dep, limit: 5 })
  let hit = list.find((x) => norm(x.nom) === target)
  if (!hit) {
    list = await query({ codePostal: c.cp })
    hit = list.find((x) => norm(x.nom) === target)
  }
  return hit ? { code: hit.code, population: hit.population ?? null } : null
}

// Enrichit les communes manquantes dans le cache (concurrence limitée), notifie à chaque résultat
export async function enrich(communes, onUpdate, concurrency = 6) {
  const cache = read()
  const todo = communes.filter((c) => !cache[c.name])
  let failed = 0
  let i = 0
  const worker = async () => {
    while (i < todo.length) {
      const c = todo[i++]
      try {
        const r = await lookup(c)
        cache[c.name] = { ...(r || { code: null, population: null }), ts: Date.now() }
        write(cache)
        onUpdate({ ...cache })
      } catch {
        failed++
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  return { failed, total: todo.length }
}
