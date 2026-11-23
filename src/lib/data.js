import annonces from '../data/annonces.json'
import cibles from '../data/communes-cibles.json'

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
  // Communes cibles sans annonce Cimco active (ignorées si une annonce existe déjà pour elles)
  for (const t of cibles) {
    if (map.has(t.commune)) continue
    map.set(t.commune, { name: t.commune, cp: t.cp, dep: t.dep, depName: DEPARTEMENTS[t.dep] || t.dep, insee: t.insee, annonces: [] })
  }
  return [...map.values()].map((c) => ({
    ...c,
    nbAnnonces: c.annonces.length,
    annonce: c.annonces[0] || null,
    budgetMin: c.annonces.length ? Math.min(...c.annonces.map((x) => x.budget)) : null,
  }))
}

// Score de potentiel SEO (0 à 100) : annonces Cimco actives (30 points) + population (70 points, échelle logarithmique)
export const SCORE_WEIGHTS = { annonces: 30, population: 70 }

export function seoBreakdown(c, pop, maxPop, maxAnn) {
  const ann = (c.nbAnnonces / maxAnn) * SCORE_WEIGHTS.annonces
  const popPts = pop ? (Math.log10(pop) / Math.log10(maxPop)) * SCORE_WEIGHTS.population : 0
  return { annonces: Math.round(ann), population: Math.round(popPts), total: Math.round(ann + popPts), maxPop, maxAnn }
}

// Niveau affiché : "À évaluer" tant que la population est inconnue
export function seoLevel(total, pop) {
  if (!pop) return { label: 'À évaluer', tone: 'slate' }
  if (total >= 75) return { label: 'Haute', tone: 'emerald' }
  if (total >= 55) return { label: 'Moyenne', tone: 'amber' }
  return { label: 'Basse', tone: 'rose' }
}
