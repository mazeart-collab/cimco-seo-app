import { fmtEur, fmtNum } from './data'

// ---------- Texte par défaut (données réelles uniquement) ----------

const dvfMain = (dvf) => (dvf?.terrain ? ['terrain', dvf.terrain] : dvf?.maison ? ['maison', dvf.maison] : dvf?.repere ? ['repere', dvf.repere] : null)

const repereText = (r) => `${fmtEur(r.prix_m2_moyen)} le m² (source : ${r.source}, ${r.periode}${r.type_bien ? ', ' + r.type_bien : ', type de bien non précisé'})`

export function buildTemplatePage(c, info, dvf, neighbors) {
  const a = c.annonce
  const pop = info?.population
  const intro =
    `${c.name} (${c.cp}, ${c.depName}) : construisez votre maison avec Cimco.` +
    (pop ? ` Population : ${fmtNum(pop)} habitants (source : geo.api.gouv.fr).` : '')

  const terrain = a.terrain_m2 ? `, terrain ${fmtNum(a.terrain_m2)} m²` : ''
  let local = `Annonce ${a.ref} : maison ${a.maison_m2} m²${terrain}, ${fmtEur(a.budget)}.`
  if (c.nbAnnonces > 1) local = `${c.nbAnnonces} annonces à ${c.name}. ` + local
  if (neighbors.length) local += ` Autres annonces Cimco en ${c.depName} : ${neighbors.map((n) => n.name).join(', ')}.`

  const main = dvfMain(dvf)
  let budget
  if (main?.[0] === 'terrain') {
    const t = main[1]
    budget = `Terrain à bâtir : ${fmtEur(t.prix_m2_moyen)} le m² en moyenne, sur ${t.nb_transactions} vente${t.nb_transactions > 1 ? 's' : ''} (source : ${dvf.source}, ${t.periode}).`
  } else if (main?.[0] === 'maison') {
    const m = main[1]
    budget = `Pas assez de ventes de terrains à bâtir pour une moyenne. Maisons vendues : ${fmtEur(m.prix_m2_moyen)} le m² habitable en moyenne, terrain inclus, sur ${m.nb_transactions} vente${m.nb_transactions > 1 ? 's' : ''} (source : ${dvf.source}, ${m.periode}).`
  } else if (main?.[0] === 'repere') {
    budget = `Prix moyen de référence : ${repereText(main[1])}. Il ne s'agit pas d'une moyenne de terrains à bâtir.`
  } else {
    budget = `Aucune moyenne DVF exploitable pour ${c.name} actuellement.`
  }

  return {
    h1: `Faire construire à ${c.name}`,
    meta: `Faire construire une maison à ${c.name} (${c.depName}) avec Cimco : annonces terrain et maison, budget et prix moyens DVF.`,
    intro,
    local,
    budget,
  }
}

// ---------- Structure de page complète (aperçu, HTML et similarité partagent la même source) ----------

export function buildSections(c, page, dvf, neighbors, photo = null) {
  const a = c.annonce
  const dvfLine = (agg, what) =>
    agg
      ? { value: `${fmtEur(agg.prix_m2_moyen)} / m²`, note: `${what}, ${agg.nb_transactions} vente${agg.nb_transactions > 1 ? 's' : ''}, ${agg.periode}` }
      : { value: 'Non disponible', note: 'Pas assez de ventes exploitables' }

  const figures = [
    c.population
      ? { label: 'Population', value: `${fmtNum(c.population)} habitants`, note: 'Source : geo.api.gouv.fr' }
      : { label: 'Population', value: 'Non disponible', note: 'geo.api.gouv.fr injoignable' },
    { label: 'Prix moyen des terrains à bâtir', ...dvfLine(dvf?.terrain, 'Terrain à bâtir') },
    { label: 'Prix moyen des maisons', ...dvfLine(dvf?.maison, 'Maisons, terrain inclus, par m² habitable') },
    { label: 'Budget de l\'annonce Cimco', value: fmtEur(a.budget), note: `Référence ${a.ref}` },
  ]
  if (dvf?.repere) {
    figures.splice(1, 0, {
      label: 'Prix moyen de référence',
      value: `${fmtEur(dvf.repere.prix_m2_moyen)} / m²`,
      note: `${dvf.repere.source}, ${dvf.repere.periode}, ${dvf.repere.type_bien || 'type de bien non précisé'}`,
    })
  }
  if (dvf && !dvf.repere) figures.push({ label: 'Source DVF', value: dvf.source, note: 'Moyennes par commune uniquement' })

  const listings = [c, ...neighbors].map((x, i) => ({
    name: x.name,
    here: i === 0,
    ref: x.annonce.ref,
    title: `Projet maison ${x.annonce.maison_m2} m²${x.annonce.terrain_m2 ? ` + terrain ${fmtNum(x.annonce.terrain_m2)} m²` : ''} à ${x.name}`,
    budget: fmtEur(x.annonce.budget),
  }))

  const breakdown = []
  if (a.terrain_m2 && dvf?.terrain) {
    breakdown.push({ label: `Terrain de ${fmtNum(a.terrain_m2)} m² (estimation : surface de l'annonce × prix moyen DVF)`, value: fmtEur(a.terrain_m2 * dvf.terrain.prix_m2_moyen) })
  }
  breakdown.push({ label: `Annonce Cimco ${a.ref} (maison ${a.maison_m2} m²${a.terrain_m2 ? ' + terrain' : ''})`, value: fmtEur(a.budget) })

  const faq = [
    {
      q: `Combien coûte un terrain à ${c.name} ?`,
      a: dvf?.terrain
        ? `Le prix moyen constaté est de ${fmtEur(dvf.terrain.prix_m2_moyen)} le m², sur ${dvf.terrain.nb_transactions} vente${dvf.terrain.nb_transactions > 1 ? 's' : ''} de terrains à bâtir (${dvf.terrain.periode}, source : ${dvf.source}).`
        : dvf?.repere
          ? `Il n'y a pas de moyenne de terrains à bâtir disponible. Prix moyen de référence : ${repereText(dvf.repere)}.`
          : dvf?.maison
          ? `Il n'y a pas assez de ventes de terrains à bâtir pour afficher une moyenne. Les maisons se vendent en moyenne ${fmtEur(dvf.maison.prix_m2_moyen)} le m² habitable, terrain inclus (${dvf.maison.nb_transactions} vente${dvf.maison.nb_transactions > 1 ? 's' : ''}, ${dvf.maison.periode}, source : ${dvf.source}).`
          : `Aucune moyenne DVF exploitable n'est disponible pour ${c.name} actuellement.`,
    },
    {
      q: `Quelle annonce Cimco est disponible à ${c.name} ?`,
      a: `L'annonce ${a.ref} : maison de ${a.maison_m2} m²${a.terrain_m2 ? ` sur un terrain de ${fmtNum(a.terrain_m2)} m²` : ''}, au budget de ${fmtEur(a.budget)}.`,
    },
    {
      q: `Cimco accompagne-t-il les projets à ${c.name} ?`,
      a: `Oui. Cimco accompagne les projets de construction en Auvergne-Rhône-Alpes, et a une annonce active en ${c.depName}, à ${c.name}.`,
    },
  ]

  const image = photo
    ? {
        src: photo.url,
        alt: `Vue de ${c.name} (${c.dep}) - faire construire avec Cimco`,
        legend: photo.legend,
        credit: `Photo : ${photo.artist}, ${photo.license}, via Wikimedia Commons`,
        pageUrl: photo.pageUrl,
        width: photo.width,
        height: photo.height,
      }
    : null

  return {
    h1: page.h1,
    image,
    intro: page.intro,
    figuresTitle: `${c.name} en chiffres`,
    figures,
    localTitle: `Annonces Cimco à ${c.name} et alentours`,
    local: page.local,
    listings,
    budgetTitle: 'Budget terrain et maison',
    budget: page.budget,
    breakdown,
    whyTitle: 'Pourquoi passer par un courtier en construction comme Cimco ?',
    why: 'Cimco est un courtier en construction de maisons individuelles indépendant.',
    whyPoints: ['Courtier indépendant depuis 2009', 'Basé à Vourles', 'Accompagnement en Auvergne-Rhône-Alpes'],
    faqTitle: `Questions fréquentes sur la construction à ${c.name}`,
    faq,
    ctaTitle: 'Demander à être rappelé',
  }
}

export function sectionsText(s) {
  return [
    s.h1, ...(s.image ? [s.image.alt, s.image.legend, s.image.credit] : []), s.intro, s.figuresTitle,
    ...s.figures.flatMap((f) => [f.label, f.value, f.note]),
    s.localTitle, s.local,
    ...s.listings.flatMap((l) => [l.title, l.budget, `Réf. ${l.ref}`]),
    s.budgetTitle, s.budget,
    ...s.breakdown.flatMap((b) => [b.label, b.value]),
    s.whyTitle, s.why, ...s.whyPoints,
    s.faqTitle, ...s.faq.flatMap((f) => [f.q, f.a]),
    s.ctaTitle,
  ].join(' ')
}

// ---------- Similarité de Jaccard (suites de 3 mots) ----------

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

// ---------- Export HTML ----------

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const STYLE = `<style>
/* Aperçu autonome : remplacez --cimco-primary et --cimco-dark par les couleurs de la charte Cimco */
.cimco-local{--cimco-primary:#1d4ed8;--cimco-dark:#0f172a;--cimco-soft:#eff6ff;--cimco-line:#e2e8f0;max-width:960px;margin:0 auto;color:var(--cimco-dark);font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.cimco-local *{box-sizing:border-box}
.cimco-local h1{font-size:2rem;line-height:1.2;margin:0 0 .75rem}
.cimco-local h2{font-size:1.35rem;margin:2rem 0 .75rem}
.cimco-local p{margin:0 0 1rem}
.cimco-local .cl-hero{background:var(--cimco-dark);color:#fff;border-radius:12px;padding:2rem}
.cimco-local .cl-hero p{margin:0;color:#cbd5e1}
.cimco-local .cl-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem}
.cimco-local .cl-card{border:1px solid var(--cimco-line);border-radius:12px;padding:1rem;background:#fff}
.cimco-local .cl-card.is-here{border-color:var(--cimco-primary);background:var(--cimco-soft)}
.cimco-local .cl-label{font-size:.75rem;text-transform:uppercase;letter-spacing:.04em;color:#64748b}
.cimco-local .cl-value{font-size:1.25rem;font-weight:700}
.cimco-local .cl-ref{font-size:.75rem;color:#94a3b8;margin-top:.5rem}
.cimco-local .cl-figure{margin:1rem 0 0}
.cimco-local .cl-figure img{display:block;width:100%;height:auto;max-height:420px;object-fit:cover;border-radius:12px}
.cimco-local .cl-figure figcaption{font-size:.8rem;color:#64748b;margin-top:.4rem}
.cimco-local .cl-note{font-size:.8rem;color:#64748b}
.cimco-local ul.cl-list{padding-left:1.2rem}
.cimco-local details{border:1px solid var(--cimco-line);border-radius:8px;padding:.75rem 1rem;margin-bottom:.5rem}
.cimco-local summary{cursor:pointer;font-weight:600}
.cimco-local .cl-cta{background:var(--cimco-soft);border-radius:12px;padding:1.5rem;margin-top:2rem}
</style>`

export function pageToHtml(s, mode = 'raw') {
  const standalone = mode === 'standalone'
  const figures = standalone
    ? `<div class="cl-grid">\n${s.figures.map((f) => `    <div class="cl-card"><div class="cl-label">${esc(f.label)}</div><div class="cl-value">${esc(f.value)}</div><div class="cl-note">${esc(f.note)}</div></div>`).join('\n')}\n  </div>`
    : `<ul>\n${s.figures.map((f) => `    <li><strong>${esc(f.label)} :</strong> ${esc(f.value)} (${esc(f.note)})</li>`).join('\n')}\n  </ul>`

  const listings = standalone
    ? `<div class="cl-grid">\n${s.listings.map((l) => `    <div class="cl-card${l.here ? ' is-here' : ''}"><div><strong>${esc(l.title)}</strong></div><div class="cl-value">${esc(l.budget)}</div><div class="cl-ref">Réf. ${esc(l.ref)}</div></div>`).join('\n')}\n  </div>`
    : `<ul>\n${s.listings.map((l) => `    <li><strong>${esc(l.title)}</strong> : ${esc(l.budget)} (Réf. ${esc(l.ref)})</li>`).join('\n')}\n  </ul>`

  const faq = standalone
    ? s.faq.map((f) => `  <details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n')
    : s.faq.map((f) => `  <h3>${esc(f.q)}</h3>\n  <p>${esc(f.a)}</p>`).join('\n')

  const figure = s.image
    ? `
  <figure${standalone ? ' class="cl-figure"' : ''}>
    <img src="${esc(s.image.src)}" alt="${esc(s.image.alt)}" width="${s.image.width}" height="${s.image.height}" loading="lazy">
    <figcaption>${esc(s.image.legend)}. ${esc(s.image.credit)} (<a href="${esc(s.image.pageUrl)}" rel="noopener">source</a>)</figcaption>
  </figure>`
    : ''

  const body = `<div class="cimco-local">
${standalone ? `  <div class="cl-hero"><h1>${esc(s.h1)}</h1><p>${esc(s.intro)}</p></div>${figure}` : `  <h1>${esc(s.h1)}</h1>${figure}\n  <p>${esc(s.intro)}</p>`}

  <h2>${esc(s.figuresTitle)}</h2>
  ${figures}

  <h2>${esc(s.localTitle)}</h2>
  <p>${esc(s.local)}</p>
  ${listings}

  <h2>${esc(s.budgetTitle)}</h2>
  <p>${esc(s.budget)}</p>
  <ul${standalone ? ' class="cl-list"' : ''}>
${s.breakdown.map((b) => `    <li>${esc(b.label)} : <strong>${esc(b.value)}</strong></li>`).join('\n')}
  </ul>

  <h2>${esc(s.whyTitle)}</h2>
  <p>${esc(s.why)}</p>
  <ul${standalone ? ' class="cl-list"' : ''}>
${s.whyPoints.map((p) => `    <li>${esc(p)}</li>`).join('\n')}
  </ul>

  <h2>${esc(s.faqTitle)}</h2>
${faq}

  <${standalone ? 'div class="cl-cta"' : 'div'}>
    <h2>${esc(s.ctaTitle)}</h2>
    <!-- Collez ici le module formulaire HubSpot "Demander à être rappelé" -->
  </div>
</div>`
  return standalone ? `${STYLE}\n${body}` : body
}
