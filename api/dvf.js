// Renvoie UNIQUEMENT des moyennes agrégées par commune (jamais le détail des ventes).
const SOURCE = 'DVF (Demandes de valeurs foncières, DGFiP) via api.cquest.org'

const isTerrainABatir = (s) => /terrain.*b.tir/i.test(s || '')

function mean(values) {
  return values.reduce((a, b) => a + b, 0) / values.length
}

export default async function handler(req, res) {
  const code = String(req.query.code_insee || '')
  if (!/^[0-9AB]{5}$/.test(code)) {
    return res.status(400).json({ error: 'code_insee invalide' })
  }

  try {
    const r = await fetch(`https://api.cquest.org/dvf?code_commune=${code}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(20000),
    })
    if (!r.ok) throw new Error('upstream ' + r.status)
    const json = await r.json()
    const rows = json.resultats || []

    // Regroupe les lignes par mutation
    const mutations = new Map()
    for (const row of rows) {
      if (row.nature_mutation !== 'Vente') continue
      const id = row.id_mutation || `${row.date_mutation}-${row.valeur_fonciere}`
      if (!mutations.has(id)) mutations.set(id, [])
      mutations.get(id).push(row)
    }

    const terrain = []
    const maison = []
    const dates = []
    for (const lignes of mutations.values()) {
      const valeur = Number(lignes[0].valeur_fonciere)
      if (!valeur || valeur <= 0) continue
      const date = lignes[0].date_mutation
      const bati = lignes.filter((l) => l.type_local)
      if (!bati.length) {
        const surf = lignes.filter((l) => isTerrainABatir(l.nature_culture)).reduce((s, l) => s + (Number(l.surface_terrain) || 0), 0)
        const autres = lignes.some((l) => l.nature_culture && !isTerrainABatir(l.nature_culture))
        if (surf >= 100 && !autres) {
          terrain.push(valeur / surf)
          dates.push(date)
        }
      } else if (bati.length === 1 && bati[0].type_local === 'Maison') {
        const surf = Number(bati[0].surface_reelle_bati)
        if (surf >= 30) {
          maison.push(valeur / surf)
          dates.push(date)
        }
      }
    }

    dates.sort()
    const agg = (v) => (v.length ? { prix_m2_moyen: Math.round(mean(v)), nb_transactions: v.length } : null)
    const periode = dates.length
      ? `ventes du ${dates[0].slice(0, 7)} au ${dates[dates.length - 1].slice(0, 7)}`
      : null

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
    return res.status(200).json({
      code_insee: code,
      source: SOURCE,
      periode,
      terrain: agg(terrain),
      maison: agg(maison),
    })
  } catch {
    return res.status(503).json({ error: 'dvf_indisponible' })
  }
}
