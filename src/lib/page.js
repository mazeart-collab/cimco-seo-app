import { fmtEur, fmtNum } from './data'

// Page de secours construite uniquement à partir de données réelles (annonce, geo.api.gouv.fr, DVF)
export function buildTemplatePage(c, info, dvf, neighbors) {
  const a = c.annonce
  const pop = info?.population
  const intro =
    `${c.name} (${c.cp}, ${c.depName})  : construisez votre maison avec Cimco.` +
    (pop ? ` Population : ${fmtNum(pop)} habitants (source : geo.api.gouv.fr).` : '')

  const terrain = a.terrain_m2 ? `, terrain ${fmtNum(a.terrain_m2)} m²` : ''
  let local = `Annonce ${a.ref} : maison ${a.maison_m2} m²${terrain}, ${fmtEur(a.budget)}.`
  if (c.nbAnnonces > 1) local = `${c.nbAnnonces} annonces à ${c.name}. ` + local
  if (neighbors.length) {
    local += ` Autres annonces Cimco en ${c.depName} : ${neighbors.join(', ')}.`
  }

  let budget
  if (dvf?.terrain) {
    const t = dvf.terrain
    budget = `Terrain à bâtir : ${fmtEur(t.prix_m2_moyen)} le m² en moyenne, sur ${t.nb_transactions} vente${t.nb_transactions > 1 ? 's' : ''} (source : ${dvf.source}, ${dvf.periode}).`
  } else {
    budget = `Aucune moyenne DVF exploitable pour les terrains de ${c.name} actuellement.`
  }

  return {
    h1: `Faire construire à ${c.name}`,
    meta: `Faire construire une maison à ${c.name} (${c.depName}) avec Cimco : annonces terrain et maison, budget et prix moyen des terrains.`,
    intro,
    local,
    budget,
  }
}

export const pageText = (p) => [p.h1, p.intro, p.local, p.budget].join(' ')

// Estimation indicative terrain + maison, uniquement si les deux données existent
export function budgetBreakdown(c, dvf) {
  const a = c.annonce
  const rows = []
  if (a.terrain_m2 && dvf?.terrain) {
    rows.push({
      label: `Terrain de ${fmtNum(a.terrain_m2)} m² (estimation : surface de l'annonce × prix moyen DVF)`,
      value: fmtEur(a.terrain_m2 * dvf.terrain.prix_m2_moyen),
    })
  }
  rows.push({
    label: `Annonce Cimco ${a.ref} (maison ${a.maison_m2} m²${a.terrain_m2 ? ' + terrain' : ''})`,
    value: fmtEur(a.budget),
  })
  return rows
}

// Similarité de Jaccard sur les triplets de mots
const shingles = (text) => {
  const w = text
    .toLowerCase()
    .replace(/[^a-zà-ÿ0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const s = new Set()
  for (let i = 0; i <= w.length - 3; i++) s.add(w.slice(i, i + 3).join(' '))
  return s
}

export function jaccard(a, b) {
  const A = shingles(a)
  const B = shingles(b)
  if (!A.size && !B.size) return 0
  let inter = 0
  for (const x of A) if (B.has(x)) inter++
  return inter / (A.size + B.size - inter)
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function pageToHtml(c, page, dvf) {
  const a = c.annonce
  const rows = budgetBreakdown(c, dvf)
    .map((r) => `      <li><span>${esc(r.label)}</span> <strong>${esc(r.value)}</strong></li>`)
    .join('\n')
  return `<section class="cimco-local">
  <h1>${esc(page.h1)}</h1>
  <p>${esc(page.intro)}</p>
  <h2>Nos annonces à ${esc(c.name)}</h2>
  <p>${esc(page.local)}</p>
  <h2>Budget terrain et maison</h2>
  <p>${esc(page.budget)}</p>
  <ul>
${rows}
  </ul>
  <div class="cimco-annonce">
    <strong>${esc(a.ref)}</strong> : maison ${a.maison_m2} m²${a.terrain_m2 ? `, terrain ${a.terrain_m2} m²` : ''}, ${esc(fmtEur(a.budget))}
  </div>
  <h2>Demander à être rappelé</h2>
  <!-- Collez ici le module formulaire HubSpot "Demander à être rappelé" -->
</section>`
}
