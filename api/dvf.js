// Renvoie UNIQUEMENT des moyennes agrégées par commune (jamais le détail des ventes).
// Source : fichiers geo-dvf de data.gouv.fr (2025 et 2024, puis 2023 en cas de 404).
// Secours : moyennes de référence enregistrées, uniquement si data.gouv.fr est injoignable ou vide.

const SRC_GEODVF = 'DVF (DGFiP) via geo-dvf, data.gouv.fr'
const MIN_VENTES = 5
const SRC_SECOURS = 'Repère enregistré (secours, data.gouv.fr indisponible)'
const TIMEOUT_MS = 5000

// Repères de prix moyen au m² fournis pour les communes de démo (type de bien non précisé sauf mention)
const SECOURS = {
  '69027': { commune: 'Brignais', prix_m2_moyen: 3731, source: 'DVF', periode: '1er semestre 2026' },
  '26362': { commune: 'Valence', prix_m2_moyen: 2635, source: 'Meilleurs Agents', periode: 'novembre 2026' },
  '01053': { commune: 'Bourg-en-Bresse', prix_m2_moyen: 2267, source: 'DVF', periode: '2025' },
  '26198': { commune: 'Montélimar', prix_m2_moyen: 2250, source: 'DVF', periode: '1er semestre 2026' },
  '26281': { commune: 'Romans-sur-Isère', prix_m2_moyen: 1825, source: 'DVF', periode: '1er semestre 2026', type_bien: 'tous biens' },
  '38563': { commune: 'Voiron', prix_m2_moyen: 3269, source: 'DVF / PAP', periode: 'novembre 2026' },
  '01283': { commune: 'Oyonnax', prix_m2_moyen: 2125, source: 'DVF', periode: '2025' },
  '73011': { commune: 'Albertville', prix_m2_moyen: 2925, source: 'DVF', periode: '1er semestre 2026' },
}

// Bornes d'exclusion des ventes à prix manifestement atypiques (€/m²)
const BOUNDS = { terrain: [5, 3000], maison: [200, 15000] }

const log = (level, event, extra = {}) => console[level](JSON.stringify({ fn: 'dvf', event, ...extra }))

const isTerrainABatir = (s) => /terrain.*b.tir/i.test(s || '')
const num = (v) => {
  const n = Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}
const fr = (iso) => iso.split('-').reverse().join('/')

// ---------- Source geo-dvf ----------

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

// Un fichier CSV pour une année : { year, status, rows } ; status 0 = injoignable (timeout ou réseau)
async function fetchYear(code, dep, year) {
  const url = `https://files.data.gouv.fr/geo-dvf/latest/csv/${year}/communes/${dep}/${code}.csv`
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!r.ok) {
      log('warn', 'geodvf_http', { code, year, status: r.status })
      return { year, status: r.status, rows: [] }
    }
    const rows = parseCsv(await r.text())
    log('info', 'geodvf_ok', { code, year, status: r.status, lignes: rows.length })
    return { year, status: r.status, rows }
  } catch (e) {
    log('error', 'geodvf_failed', { code, year, message: String(e?.message || e) })
    return { year, status: 0, rows: [] }
  }
}

async function fromGeoDvf(code) {
  const dep = code.startsWith('97') ? code.slice(0, 3) : code.slice(0, 2)
  const settled = await Promise.allSettled([fetchYear(code, dep, 2025), fetchYear(code, dep, 2024)])
  const results = settled.map((s) => (s.status === 'fulfilled' ? s.value : { status: 0, rows: [] }))
  // 2023 seulement si l'un des deux fichiers récents est introuvable (404)
  if (results.some((r) => r.status === 404)) results.push(await fetchYear(code, dep, 2023))
  return { rows: results.flatMap((r) => r.rows), reachable: results.some((r) => r.status !== 0) }
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

  const { rows, reachable } = await fromGeoDvf(code)

  if (!rows.length) {
    // Secours : uniquement si data.gouv.fr est injoignable ou ne renvoie aucune ligne
    const repere = SECOURS[code]
    log('warn', 'geodvf_empty', { code, injoignable: !reachable, secours: !!repere })
    if (repere) {
      const { commune, ...r } = repere
      return res.status(200).json({ code_insee: code, source: SRC_SECOURS, terrain: null, maison: null, repere: r })
    }
    return res.status(503).json({ error: 'dvf_indisponible' })
  }

  const agg = aggregate(rows)
  // Moyenne publiée seulement si l'échantillon est assez large
  for (const k of ['terrain', 'maison']) if (agg[k] && agg[k].nb_transactions < MIN_VENTES) agg[k] = null
  if (!agg.terrain && !agg.maison && SECOURS[code]) {
    const { commune, ...r } = SECOURS[code]
    log('info', 'echantillon_trop_faible', { code })
    return res.status(200).json({ code_insee: code, source: SRC_SECOURS, terrain: null, maison: null, repere: r })
  }
  log('info', 'aggregated', { code, rows: rows.length, mutations: agg.nb_mutations, terrain: agg.terrain?.nb_transactions ?? 0, maison: agg.maison?.nb_transactions ?? 0 })

  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
  return res.status(200).json({ code_insee: code, source: SRC_GEODVF, terrain: agg.terrain, maison: agg.maison })
}
