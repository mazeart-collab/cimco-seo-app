// Renvoie UNIQUEMENT des moyennes agrégées par commune (jamais le détail des ventes).
// Source 1 : api.cquest.org (JSON ou GeoJSON). Source 2 (secours) : fichiers geo-dvf de data.gouv.fr.

const SRC_CQUEST = 'DVF (DGFiP) via api.cquest.org'
const SRC_GEODVF = 'DVF (DGFiP) via geo-dvf, data.gouv.fr'
const GEODVF_YEARS = [2025, 2024, 2023, 2022, 2021]

// Bornes d'exclusion des ventes à prix manifestement atypiques (€/m²)
const BOUNDS = { terrain: [5, 3000], maison: [200, 15000] }

const log = (level, event, extra = {}) => console[level](JSON.stringify({ fn: 'dvf', event, ...extra }))

const isTerrainABatir = (s) => /terrain.*b.tir/i.test(s || '')
const num = (v) => {
  const n = Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}
const fr = (iso) => iso.split('-').reverse().join('/')

// ---------- Sources ----------

// L'API peut renvoyer { resultats: [...] } (JSON) ou { features: [{ properties }] } (GeoJSON)
export function normalizeCquest(json) {
  if (Array.isArray(json?.resultats)) return json.resultats
  if (Array.isArray(json?.features)) return json.features.map((f) => f.properties || {})
  if (Array.isArray(json)) return json
  return []
}

async function fromCquest(code) {
  const r = await fetch(`https://api.cquest.org/dvf?code_commune=${code}`, {
    headers: { Accept: 'application/json, application/geo+json' },
    signal: AbortSignal.timeout(20000),
  })
  if (!r.ok) throw new Error('cquest_http_' + r.status)
  return normalizeCquest(await r.json())
}

function parseCsvLine(line) {
  const out = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (q) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') q = false
      else cur += ch
    } else if (ch === '"') q = true
    else if (ch === ',') {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out
}

export function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (!lines.length) return []
  const head = parseCsvLine(lines[0])
  return lines.slice(1).map((l) => {
    const cells = parseCsvLine(l)
    return Object.fromEntries(head.map((h, i) => [h, cells[i]]))
  })
}

async function fromGeoDvf(code) {
  const dep = code.startsWith('97') ? code.slice(0, 3) : code.slice(0, 2)
  const results = await Promise.all(
    GEODVF_YEARS.map(async (y) => {
      try {
        const r = await fetch(`https://files.data.gouv.fr/geo-dvf/latest/csv/${y}/communes/${dep}/${code}.csv`, { signal: AbortSignal.timeout(15000) })
        if (!r.ok) return []
        return parseCsv(await r.text())
      } catch (e) {
        log('warn', 'geodvf_year_failed', { code, year: y, message: String(e?.message || e) })
        return []
      }
    }),
  )
  return results.flat()
}

// ---------- Agrégation ----------

export function aggregate(rows) {
  const mutations = new Map()
  for (const row of rows) {
    if (row.nature_mutation !== 'Vente') continue
    const id = row.id_mutation || `${row.date_mutation}-${row.valeur_fonciere}`
    if (!mutations.has(id)) mutations.set(id, [])
    mutations.get(id).push(row)
  }

  const bag = { terrain: { v: [], d: [] }, maison: { v: [], d: [] } }
  for (const lignes of mutations.values()) {
    const valeur = num(lignes[0].valeur_fonciere)
    const date = String(lignes[0].date_mutation || '').slice(0, 10)
    if (valeur <= 0 || !date) continue

    // Les dépendances n'empêchent pas de reconnaître une vente de maison
    const bati = lignes.filter((l) => l.type_local && l.type_local !== 'Dépendance')
    if (!bati.length) {
      const land = lignes.filter((l) => isTerrainABatir(l.nature_culture))
      const autres = lignes.some((l) => l.nature_culture && !isTerrainABatir(l.nature_culture))
      const surf = land.reduce((s, l) => s + num(l.surface_terrain), 0)
      if (!autres && surf >= 100) {
        bag.terrain.v.push(valeur / surf)
        bag.terrain.d.push(date)
      }
    } else if (bati.length === 1 && bati[0].type_local === 'Maison') {
      const surf = num(bati[0].surface_reelle_bati)
      if (surf >= 30) {
        bag.maison.v.push(valeur / surf)
        bag.maison.d.push(date)
      }
    }
  }

  const out = {}
  for (const k of ['terrain', 'maison']) {
    const [lo, hi] = BOUNDS[k]
    const keep = bag[k].v.map((p, i) => [p, bag[k].d[i]]).filter(([p]) => p >= lo && p <= hi)
    if (!keep.length) {
      out[k] = null
      continue
    }
    const dates = keep.map(([, d]) => d).sort()
    out[k] = {
      prix_m2_moyen: Math.round(keep.reduce((s, [p]) => s + p, 0) / keep.length),
      nb_transactions: keep.length,
      periode: `ventes du ${fr(dates[0])} au ${fr(dates[dates.length - 1])}`,
      type_bien:
        k === 'terrain'
          ? 'Terrains à bâtir (ventes sans bâti), prix au m² de terrain'
          : 'Maisons (une seule maison par vente), prix tout compris au m² habitable, terrain inclus',
    }
  }
  return { ...out, nb_mutations: mutations.size }
}

// ---------- Handler ----------

export default async function handler(req, res) {
  const code = String(req.query.code_insee || '')
  if (!/^[0-9AB]{5}$/.test(code)) {
    log('warn', 'bad_code_insee', { received: code.slice(0, 12) })
    return res.status(400).json({ error: 'code_insee invalide' })
  }

  let rows = []
  let source = SRC_CQUEST
  try {
    rows = await fromCquest(code)
    if (!rows.length) log('warn', 'cquest_empty', { code })
  } catch (e) {
    log('error', 'cquest_failed', { code, message: String(e?.message || e) })
  }

  // Secours : fichiers geo-dvf si cquest ne répond pas ou ne renvoie rien
  if (!rows.length) {
    try {
      rows = await fromGeoDvf(code)
      source = SRC_GEODVF
      if (!rows.length) log('warn', 'geodvf_empty', { code })
    } catch (e) {
      log('error', 'geodvf_failed', { code, message: String(e?.message || e) })
    }
  }

  if (!rows.length) return res.status(503).json({ error: 'dvf_indisponible' })

  const agg = aggregate(rows)
  log('info', 'aggregated', { code, source, rows: rows.length, mutations: agg.nb_mutations, terrain: agg.terrain?.nb_transactions ?? 0, maison: agg.maison?.nb_transactions ?? 0 })

  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
  return res.status(200).json({ code_insee: code, source, terrain: agg.terrain, maison: agg.maison })
}
