import annonces from '../data/annonces.json'

export const DEPARTEMENTS = {
  '01': 'Ain',
  '07': 'Ardèche',
  '21': "Côte-d'Or",
  '26': 'Drôme',
  '38': 'Isère',
  '42': 'Loire',
  '69': 'Rhône',
  '71': 'Saône-et-Loire',
  '73': 'Savoie',
  '74': 'Haute-Savoie',
}

export const SEED_TREATED = ['Brignais', 'Valence', 'Bourg-en-Bresse', 'Voiron', 'Montélimar']

export const norm = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

export const fmtEur = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' €'
export const fmtNum = (n) => new Intl.NumberFormat('fr-FR').format(n)

// Regroupe les annonces par commune
export function buildCommunes() {
  const map = new Map()
  for (const a of annonces) {
    if (!map.has(a.commune)) {
      map.set(a.commune, {
        name: a.commune,
        cp: a.cp,
        dep: a.dep,
        depName: DEPARTEMENTS[a.dep] || a.dep,
        annonces: [],
      })
    }
    map.get(a.commune).annonces.push(a)
  }
  return [...map.values()].map((c) => ({
    ...c,
    nbAnnonces: c.annonces.length,
    annonce: c.annonces[0],
    budgetMin: Math.min(...c.annonces.map((x) => x.budget)),
  }))
}

// Score de potentiel SEO (0 à 100) : annonces actives (30 %) + population (70 %)
export function seoScore(c, pop, maxPop, maxAnn) {
  const a = (c.nbAnnonces / maxAnn) * 30
  if (!pop) return Math.round(a)
  const p = (Math.log10(pop) / Math.log10(maxPop)) * 70
  return Math.round(a + p)
}
