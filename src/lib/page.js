import { fmtEur, fmtNum } from './data'

// Crédit court : saisi à la main s'il existe (même vide), sinon celui de Wikimedia Commons
export const creditOf = (photo) =>
  photo.creditText !== undefined ? photo.creditText.trim() : photo.manual ? '' : `Photo : ${photo.artist}, licence ${photo.license}`

export const LISTINGS_URL = 'https://cimco.fr/annonces-maisons-terrains'

// ---------- Texte par défaut (données réelles uniquement, sans nom de source dans les paragraphes) ----------

// Préposition correcte devant le nom du département ("dans le Rhône", "en Isère"...)
const DANS = { '01': "dans l'Ain", '42': 'dans la Loire', '26': 'dans la Drôme', '69': 'dans le Rhône' }
export const inDep = (c) => DANS[c.dep] || `en ${c.depName}`

// Zone exacte des autres annonces affichées : le département si elles y sont toutes, sinon la région
export const listingsZone = (c, neighbors) => (neighbors.every((n) => n.dep === c.dep) ? inDep(c) : 'en Auvergne-Rhône-Alpes')

const plural = (n, w) => `${n} ${w}${n > 1 ? 's' : ''}`

// Sources affichées uniquement en note de bas de bloc (.cl-note)
function sourcesOf(c, dvf) {
  const out = []
  if (c.population) out.push('population, INSEE via geo.api.gouv.fr')
  if (dvf?.terrain || dvf?.maison) {
    const periode = dvf.terrain?.periode || dvf.maison?.periode
    out.push(`prix moyens, ${dvf.source}${periode ? ', ' + periode : ''}`)
  } else if (dvf?.repere) {
    out.push(`prix moyen, ${dvf.repere.source}, ${dvf.repere.periode}`)
  }
  return out
}

function templateFaq(c, dvf) {
  const a = c.annonce
  const terrainHint = dvf?.terrain
    ? `Le prix moyen constaté des terrains à bâtir, rappelé plus haut, vous donne un premier repère pour négocier.`
    : dvf?.maison
      ? `Le prix moyen des maisons de la commune, rappelé plus haut, aide à situer la valeur du foncier.`
      : `Cimco vous aide à situer les prix du foncier sur le secteur.`
  return [
    {
      q: `Combien de temps faut-il pour faire construire à ${c.name} ?`,
      a: `Comptez d'abord la recherche du terrain et l'étude du projet, puis l'instruction du permis de construire par la mairie de ${c.name}, qui prend au minimum deux mois pour une maison individuelle. La durée du chantier est ensuite fixée noir sur blanc dans votre contrat de construction (CCMI), ce qui vous protège des dérives.`,
    },
    {
      q: `Quelles sont les étapes d'un projet de construction ?`,
      a: `Définition du budget et du financement, recherche du terrain, choix du constructeur et des plans, signature du CCMI, obtention du permis de construire et du prêt, puis chantier et remise des clés. Cimco coordonne chacune de ces étapes avec vous.`,
    },
    {
      q: `Puis-je bénéficier du prêt à taux zéro pour construire à ${c.name} ?`,
      a: `Le PTZ peut financer une partie de l'achat d'une maison neuve. L'éligibilité dépend de vos revenus, de la composition du foyer et de la zone dans laquelle se situe ${c.name}. Votre conseiller Cimco vous aide à intégrer ces aides dans votre plan de financement.`,
    },
    {
      q: `Comment bien choisir son terrain à ${c.name} ?`,
      a: `Vérifiez les règles du plan local d'urbanisme, l'orientation, la pente, la nature du sol et la présence des réseaux en limite de parcelle. ${terrainHint}${a ? '' : ` Sans annonce publiée à ${c.name} en ce moment, Cimco recherche pour vous des terrains sur la commune et alentour.`}`,
    },
    {
      q: `Quelle différence entre un courtier en construction et un constructeur ?`,
      a: `Le constructeur vend sa propre gamme de maisons. Le courtier, lui, travaille pour vous : il met en concurrence plusieurs constructeurs sélectionnés, compare les offres à cahier des charges égal et vous accompagne jusqu'à la remise des clés, ${inDep(c)} comme dans toute la région.`,
    },
  ]
}

// ---------- Métadonnées SEO par défaut (données réelles, sans IA) ----------

// Garde la variante la plus complète qui tient dans la limite
const fit = (variants, max) => variants.filter((v) => v.length <= max).sort((x, y) => y.length - x.length)[0] || variants[variants.length - 1].slice(0, max)

export function templateMetas(c, dvf) {
  const a = c.annonce
  const metaTitle = fit(
    [
      ...(a ? [`Faire construire à ${c.name} : maison ${a.maison_m2} m² | Cimco`, `Faire construire à ${c.name} : projet Cimco`] : []),
      `Faire construire à ${c.name} ${inDep(c)} | Cimco`,
      `Faire construire à ${c.name} (${c.cp}) | Cimco`,
      `Faire construire à ${c.name}`,
    ],
    60,
  )
  const repere = a
    ? `Projet maison ${a.maison_m2} m²${a.terrain_m2 ? ' + terrain' : ''} à ${fmtEur(a.budget)} à ${c.name}.`
    : dvf?.terrain
      ? `Terrain à bâtir à ${c.name} : ${fmtEur(dvf.terrain.prix_m2_moyen)}/m² en moyenne (DVF).`
      : `Construire à ${c.name} (${c.cp}) ${inDep(c)}.`
  const metaDescription = fit(
    [
      `${repere} Cimco compare les constructeurs et sécurise votre CCMI. Demandez à être rappelé.`,
      `${repere} Un courtier compare les constructeurs pour vous. Demandez à être rappelé.`,
      `${repere} Cimco vous accompagne. Demandez à être rappelé.`,
      repere,
    ],
    155,
  )
  return { metaTitle, metaDescription }
}

// Similarité des métas : le nom, le code postal et le département sont masqués pour détecter une formule générique
const maskCommune = (text, c) =>
  [c.name, c.cp, c.depName].filter(Boolean).reduce((t, w) => t.split(w).join(' commune '), String(text || ''))

export const metaText = (s, c) => maskCommune(`${s.metaTitle} ${s.metaDescription}`, c)

export function buildTemplatePage(c, info, dvf, neighbors) {
  const a = c.annonce
  const intro = `Faire construire à ${c.name}, c'est choisir une maison pensée pour votre famille, dans un cadre que vous aimez. Cimco, courtier en construction de maisons individuelles ${inDep(c)}, vous accompagne de la recherche du terrain jusqu'à la remise des clés.`

  const names = neighbors.map((n) => n.name).join(', ')
  let local
  if (a) {
    local = `${c.name} fait partie des communes où Cimco propose ${c.nbAnnonces > 1 ? 'plusieurs projets' : 'un projet'} terrain et maison prêt à étudier, avec un budget connu dès le départ.`
    if (neighbors.length) local += ` Vous hésitez encore sur le secteur ? D'autres projets sont disponibles ailleurs ${listingsZone(c, neighbors)}, à ${names}.`
  } else {
    local = `Aucune annonce n'est publiée à ${c.name} en ce moment, ce qui ne vous empêche pas d'y construire : Cimco prospecte les terrains de la commune et des environs pour vous.`
    if (neighbors.length) local += ` En attendant, des projets sont déjà disponibles ailleurs ${listingsZone(c, neighbors)}, à ${names}.`
  }

  const budget = `Un budget de construction se construit en trois blocs. Le terrain, avec les frais de notaire. La maison, dont le prix est fixé dans le contrat de construction (CCMI) avec ses garanties de prix, de délais et de livraison. Enfin les frais annexes : viabilisation, raccordements aux réseaux, étude de sol et taxe d'aménagement.${
    dvf?.terrain || dvf?.maison || dvf?.repere ? ` Les prix moyens de ${c.name}, présentés plus haut, vous aident à caler la part du terrain.` : ''
  }`

  return {
    h1: `Faire construire à ${c.name}`,
    ...templateMetas(c, dvf),
    intro,
    local,
    budget,
    faq: templateFaq(c, dvf),
  }
}

// ---------- Structure de page complète (aperçu, HTML et similarité partagent la même source) ----------

export const WHY_POINTS = [
  { title: 'Des constructeurs mis en concurrence', text: 'Cimco compare pour vous les offres de constructeurs sélectionnés, à cahier des charges égal.' },
  { title: 'Un CCMI sécurisé', text: 'Prix ferme, délais contractuels et garantie de livraison : votre contrat est vérifié avant signature.' },
  { title: 'Du terrain aux clés', text: 'Recherche du terrain, plans, permis, financement et chantier : un seul interlocuteur du début à la fin.' },
  { title: 'Temps gagné, budget maîtrisé', text: 'Vous évitez les démarches en double et gardez une vision claire du coût global du projet.' },
  { title: 'Indépendant depuis 2009', text: 'Un courtier basé à Vourles, qui connaît les communes et les constructeurs de la région.' },
]

// Réassurance : faits établis sur Cimco uniquement (aucune statistique)
export const TRUST = [
  { icon: 'shield', title: 'Indépendant depuis 2009', text: 'Courtier neutre, non lié à un seul constructeur' },
  { icon: 'pin', title: 'Ancrage Auvergne-Rhône-Alpes', text: 'Basé à Vourles, connaissance du terrain local' },
  { icon: 'doc', title: 'Contrat CCMI sécurisé', text: 'Prix ferme, délais et garantie de livraison vérifiés' },
  { icon: 'chat', title: '1er échange sans engagement', text: 'Étude de faisabilité et de budget' },
]
export const REASSURANCE = 'Premier échange gratuit et sans engagement · Rappel par un conseiller Cimco · Données confidentielles'

export function buildSections(c, page, dvf, neighbors, photo = null) {
  const a = c.annonce
  const dvfLine = (agg, what) => ({
    value: `${fmtEur(agg.prix_m2_moyen)} / m²`,
    note: `${what}, ${plural(agg.nb_transactions, 'vente')}, ${agg.periode}`,
  })

  // Les cartes dont la donnée est absente sont masquées
  const figures = []
  if (c.population) figures.push({ label: 'Population', value: `${fmtNum(c.population)} habitants`, note: 'Dernier recensement' })
  if (dvf?.terrain) figures.push({ label: 'Prix moyen des terrains à bâtir', ...dvfLine(dvf.terrain, 'Moyenne communale') })
  if (dvf?.maison) figures.push({ label: 'Prix moyen des maisons', ...dvfLine(dvf.maison, 'Terrain inclus, par m² habitable') })
  if (!dvf?.terrain && !dvf?.maison && dvf?.repere) {
    figures.push({ label: 'Prix immobilier moyen', value: `${fmtEur(dvf.repere.prix_m2_moyen)} / m²`, note: dvf.repere.periode })
  }
  if (a) figures.push({ label: 'Budget projet Cimco', value: fmtEur(a.budget), note: `Maison de ${a.maison_m2} m²${a.terrain_m2 ? ' + terrain' : ''}` })

  const sources = sourcesOf(c, dvf)
  const figuresNote = sources.length ? `Sources : ${sources.join(' ; ')}. Prix DVF : moyennes par commune.` : ''

  const listings = (a ? [c, ...neighbors] : neighbors).map((x, i) => ({
    name: x.name,
    here: !!a && i === 0,
    url: x.annonce.url || LISTINGS_URL,
    title: `Maison ${x.annonce.maison_m2} m²${x.annonce.terrain_m2 ? ` sur terrain de ${fmtNum(x.annonce.terrain_m2)} m²` : ''}`,
    place: x.name,
    budget: fmtEur(x.annonce.budget),
  }))

  // Structure d'un budget global (postes, sans montant estimé)
  const breakdown = [
    { label: 'Terrain', value: 'Prix d\'achat + frais de notaire' },
    { label: 'Maison', value: 'Prix ferme au CCMI, garanties incluses' },
    { label: 'Viabilisation et raccordements', value: 'Eau, électricité, assainissement, télécoms' },
    { label: 'Frais annexes', value: 'Étude de sol, taxe d\'aménagement, assurance dommages-ouvrage' },
  ]

  const faq = Array.isArray(page.faq) && page.faq.length ? page.faq : templateFaq(c, dvf)

  const image = photo
    ? {
        src: photo.url,
        alt: `Vue de ${c.name} (${c.dep}) - faire construire avec Cimco`,
        credit: creditOf(photo),
        width: photo.width,
        height: photo.height,
      }
    : null

  return {
    h1: page.h1,
    metaTitle: page.metaTitle || templateMetas(c, dvf).metaTitle,
    metaDescription: page.metaDescription || templateMetas(c, dvf).metaDescription,
    image,
    badges: [`${c.depName} (${c.dep})`, c.cp, ...(a ? [plural(c.nbAnnonces, 'projet Cimco')] : [])],
    heroCta: a ? `Étudier mon projet à ${c.name}` : 'Lancer ma recherche de terrain',
    intro: page.intro,
    figuresTitle: `${c.name} en chiffres`,
    figures,
    figuresNote,
    localTitle: neighbors.length ? `Construire à ${c.name} et ${listingsZone(c, neighbors)}` : `Construire à ${c.name}`,
    local: page.local,
    listingsCta: { label: 'Voir toutes les annonces', url: LISTINGS_URL },
    listings,
    budgetTitle: `Votre budget pour faire construire à ${c.name}`,
    budget: page.budget,
    breakdown,
    midCtaTitle: `Un projet à ${c.name} ?`,
    midCta: 'Parler de mon budget à un conseiller',
    whyTitle: 'Pourquoi passer par un courtier en construction comme Cimco ?',
    why: `Faire construire est souvent le projet d'une vie. Cimco se place à vos côtés, et non du côté d'un constructeur, pour sécuriser chaque décision, de ${c.name} à l'ensemble de l'Auvergne-Rhône-Alpes.`,
    whyTransparency: "Comment ça fonctionne : Cimco défend les intérêts du futur propriétaire, et non ceux d'un constructeur. Nous mettons plusieurs partenaires locaux en concurrence sur un même cahier des charges, pour que vous compariez des offres réellement équivalentes.",
    whyPoints: WHY_POINTS,
    trust: TRUST,
    reassurance: REASSURANCE,
    faqTitle: `Questions fréquentes sur la construction à ${c.name}`,
    faq,
    ctaTitle: a ? `Être rappelé pour un projet à ${c.name}` : `Être alerté des prochains terrains à ${c.name}`,
    ctaText: 'Un conseiller Cimco vous rappelle pour faire le point sur votre projet, sans engagement.',
    ctaComment: 'Formulaire de démonstration : à remplacer par le module formulaire HubSpot en production.',
  }
}

export function sectionsText(s) {
  return [
    s.h1, ...(s.image ? [s.image.alt, s.image.credit].filter(Boolean) : []), ...s.badges, s.heroCta, s.intro, s.figuresTitle,
    ...s.figures.flatMap((f) => [f.label, f.value, f.note]), s.figuresNote,
    s.localTitle, s.local,
    ...s.listings.flatMap((l) => [l.title, l.place, l.budget, 'Voir le projet']), s.listingsCta.label,
    s.budgetTitle, s.budget,
    ...s.breakdown.flatMap((b) => [b.label, b.value]),
    s.midCtaTitle, s.midCta,
    s.whyTitle, s.why, ...s.whyPoints.flatMap((p) => [p.title, p.text]),
    s.faqTitle, ...s.faq.flatMap((f) => [f.q, f.a]),
    ...s.trust.flatMap((t) => [t.title, t.text]), s.whyTransparency,
    s.ctaTitle, s.ctaText, s.reassurance,
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

// Badge "?" de crédit photo : infobulle en pur CSS (survol et focus clavier)
const CREDIT_CSS = `.cimco-local .cimco-photo{position:relative}
.cimco-local .cimco-credit{position:absolute;right:.6rem;bottom:.6rem;width:1.5rem;height:1.5rem;border-radius:50%;background:rgba(26,26,24,.55);color:#fff;font:600 .8rem/1.5rem system-ui,sans-serif;text-align:center;cursor:help;outline:none}
.cimco-local .cimco-credit:hover,.cimco-local .cimco-credit:focus{background:rgba(26,26,24,.85)}
.cimco-local .cimco-credit-tip{display:none;position:absolute;right:0;bottom:2rem;width:max-content;max-width:min(16rem,70vw);background:#1a1a18;color:#fff;border-radius:8px;padding:.4rem .6rem;font:400 .75rem/1.35 system-ui,sans-serif;text-align:left}
.cimco-local .cimco-credit:hover .cimco-credit-tip,.cimco-local .cimco-credit:focus .cimco-credit-tip{display:block}`

// Icônes sobres (traits, couleur héritée) du bandeau de réassurance
const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`
const TRUST_ICONS = {
  shield: svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>'),
  pin: svg('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>'),
  doc: svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="m9 15 2 2 4-4"/>'),
  chat: svg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
}

const STYLE = `<style>
/* Charte relevée sur cimco.fr (fond #fbfaf8, encre #1a1a18, accent #8fabb9 / #4a6a78) ; si le thème charge déjà Manrope et Poppins, elles s'appliquent d'elles-mêmes */
.cimco-local{--cimco-primary:#4a6a78;--cimco-accent:#8fabb9;--cimco-dark:#1a1a18;--cimco-muted:#57534c;--cimco-bg:#fbfaf8;--cimco-alt:#f4f3ef;--cimco-tint:#cfe3ec;--cimco-line:#1a1a1814;--cimco-shadow:0 1px 2px rgba(26,26,24,.04),0 8px 24px rgba(26,26,24,.06);color:var(--cimco-dark);background:var(--cimco-bg);font:16px/1.7 "Poppins",system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
.cimco-local *{box-sizing:border-box}
.cimco-local h1,.cimco-local h2,.cimco-local h3{font-family:"Manrope",system-ui,-apple-system,sans-serif;letter-spacing:-.02em;color:inherit}
.cimco-local h1{font-size:clamp(2rem,4.5vw,2.9rem);line-height:1.1;font-weight:800;margin:0 0 1rem}
.cimco-local h2{font-size:clamp(1.4rem,3vw,1.85rem);line-height:1.2;font-weight:800;margin:0 0 1rem}
.cimco-local h2::before{content:"";display:block;width:2.5rem;height:3px;border-radius:3px;background:var(--cimco-accent);margin-bottom:.8rem}
.cimco-local h3{font-size:1.05rem;line-height:1.35;margin:0 0 .35rem}
.cimco-local p{margin:0 0 1rem;max-width:70ch}
.cimco-local .cl-band{padding:3.5rem 1.25rem}
.cimco-local .cl-inner{max-width:1040px;margin:0 auto}
.cimco-local .cl-band--alt{background:var(--cimco-alt)}
.cimco-local .cl-band--accent{background:var(--cimco-primary);color:#fff}
.cimco-local .cl-band--accent p{color:rgba(255,255,255,.88)}
.cimco-local .cl-band--accent h2::before{background:var(--cimco-tint)}
.cimco-local .cl-band--soft{background:var(--cimco-tint)}
.cimco-local .cl-lead{font-size:1.08rem;color:var(--cimco-muted)}
.cimco-local .cl-hero{display:grid;gap:2rem;align-items:center}
.cimco-local .cl-badges{display:flex;flex-wrap:wrap;gap:.5rem;margin:0 0 1.1rem;padding:0;list-style:none}
.cimco-local .cl-badges li{font-size:.78rem;font-weight:600;letter-spacing:.02em;color:var(--cimco-primary);background:#fff;border:1px solid var(--cimco-line);border-radius:999px;padding:.3rem .8rem}
.cimco-local .cl-btn{display:inline-block;border:0;border-radius:999px;padding:.9rem 1.6rem;font:inherit;font-weight:700;line-height:1.2;color:#fff;background:var(--cimco-primary);text-decoration:none;cursor:pointer;box-shadow:0 6px 18px rgba(74,106,120,.28);transition:filter .15s,transform .15s}
.cimco-local .cl-btn:hover{filter:brightness(.93);transform:translateY(-1px)}
.cimco-local .cl-more-listings{margin:1.75rem 0 0;text-align:center;max-width:none}
.cimco-local .cl-btn.cl-btn--ghost{background:#fff;color:var(--cimco-primary);border:1.5px solid var(--cimco-primary);box-shadow:none}
.cimco-local .cl-btn.cl-btn--ghost:hover{background:var(--cimco-primary);color:#fff;filter:none}
.cimco-local .cl-link{font-weight:700;color:var(--cimco-primary);text-decoration:none;border-bottom:2px solid var(--cimco-accent)}
.cimco-local .cl-link:hover{border-color:var(--cimco-primary)}
.cimco-local .cl-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;margin-top:1.5rem}
.cimco-local .cl-card{border:1px solid var(--cimco-line);border-radius:20px;padding:1.35rem;background:#fff;box-shadow:var(--cimco-shadow)}
.cimco-local a.cl-card{display:flex;flex-direction:column;gap:.25rem;color:inherit;text-decoration:none;transition:border-color .15s,box-shadow .15s,transform .15s}
.cimco-local a.cl-card:hover{border-color:var(--cimco-primary);box-shadow:0 12px 32px rgba(26,26,24,.12);transform:translateY(-2px)}
.cimco-local .cl-card.is-here{border-color:var(--cimco-primary);box-shadow:inset 0 0 0 1px var(--cimco-primary),var(--cimco-shadow)}
.cimco-local .cl-place{font-size:.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--cimco-primary)}
.cimco-local .cl-more{font-size:.85rem;font-weight:600;color:var(--cimco-primary);margin-top:.5rem}
.cimco-local .cl-label{font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#6b665e}
.cimco-local .cl-value{font-family:"Manrope",system-ui,sans-serif;font-size:1.5rem;font-weight:800;line-height:1.25;color:var(--cimco-primary);margin:.2rem 0}
.cimco-local .cl-figure{margin:0;border-radius:24px;overflow:hidden;box-shadow:0 18px 40px rgba(26,26,24,.14)}
.cimco-local .cl-figure img{display:block;width:100%;height:auto;aspect-ratio:4/3;object-fit:cover}
${CREDIT_CSS}
.cimco-local .cl-note{font-size:.78rem;line-height:1.5;color:#6b665e;margin:1.25rem 0 0}
.cimco-local .cl-band--accent .cl-note{color:rgba(255,255,255,.7)}
.cimco-local ul.cl-list{list-style:none;margin:1.5rem 0 0;padding:0;background:#fff;border:1px solid var(--cimco-line);border-radius:20px;overflow:hidden;box-shadow:var(--cimco-shadow)}
.cimco-local ul.cl-list li{display:flex;flex-wrap:wrap;justify-content:space-between;gap:.25rem 1rem;padding:.95rem 1.35rem;border-top:1px solid var(--cimco-line)}
.cimco-local ul.cl-list li:first-child{border-top:0}
.cimco-local ul.cl-list span{color:var(--cimco-muted)}
.cimco-local .cl-mid{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:1rem;margin-top:2rem;padding:1.25rem 1.5rem;border-radius:20px;background:var(--cimco-alt)}
.cimco-local .cl-mid p{margin:0;font-weight:600}
.cimco-local ul.cl-points{list-style:none;margin:1.5rem 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem}
.cimco-local ul.cl-points li{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);border-radius:18px;padding:1.1rem 1.25rem}
.cimco-local ul.cl-points strong{display:block;font-family:"Manrope",system-ui,sans-serif;margin-bottom:.3rem;color:#fff}
.cimco-local ul.cl-points span{font-size:.92rem;color:rgba(255,255,255,.85)}
.cimco-local details{background:#fff;border:1px solid var(--cimco-line);border-radius:18px;padding:1.05rem 1.35rem;margin-bottom:.7rem;box-shadow:var(--cimco-shadow)}
.cimco-local summary{cursor:pointer;font-weight:600;line-height:1.45}
.cimco-local details p{margin:.7rem 0 0;color:var(--cimco-muted)}
.cimco-local .cl-form{display:grid;grid-template-columns:1fr;gap:.75rem;margin-top:1.25rem;max-width:640px}
.cimco-local .cl-form input{width:100%;border:1px solid var(--cimco-line);border-radius:14px;padding:.8rem 1rem;font:inherit;background:#fff}
.cimco-local .cl-form input:focus{outline:2px solid var(--cimco-primary);outline-offset:1px}
.cimco-local .cl-form .cl-full,.cimco-local .cl-form .cl-btn{grid-column:1/-1}
.cimco-local .cl-band.cl-band--trust{padding-top:1.5rem;padding-bottom:1.5rem;background:#fff;border-top:1px solid var(--cimco-line);border-bottom:1px solid var(--cimco-line)}
.cimco-local ul.cl-trust{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:1rem 1.5rem}
.cimco-local ul.cl-trust li{display:flex;align-items:flex-start;gap:.7rem}
.cimco-local ul.cl-trust svg{flex:none;width:36px;height:36px;padding:8px;border-radius:12px;background:var(--cimco-tint);color:var(--cimco-primary)}
.cimco-local ul.cl-trust strong{display:block;font-family:"Manrope",system-ui,sans-serif;font-size:.95rem;line-height:1.3}
.cimco-local ul.cl-trust span{font-size:.82rem;line-height:1.45;color:var(--cimco-muted)}
.cimco-local .cl-transparency{background:rgba(255,255,255,.1);border-left:3px solid var(--cimco-tint);border-radius:0 12px 12px 0;padding:.8rem 1rem;font-size:.95rem}
.cimco-local .cl-reassurance{font-size:.78rem;color:var(--cimco-muted);margin:.75rem 0 0}
@media(min-width:600px){.cimco-local .cl-form{grid-template-columns:1fr 1fr}}
@media(min-width:768px){.cimco-local .cl-band{padding:4.5rem 2rem}.cimco-local .cl-hero.has-photo{grid-template-columns:1.05fr .95fr;gap:3rem}}
</style>`

export function pageToHtml(s, mode = 'raw') {
  const standalone = mode === 'standalone'
  const note = (t) => (t ? `\n    <p class="cl-note">${esc(t)}</p>` : '')
  const cta = (label, cls = 'cl-btn') => `<a class="${cls}" href="#contact-cimco">${esc(label)}</a>`

  const badges = `<ul class="cl-badges">${s.badges.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`

  const figures = `<div class="cl-grid">\n${s.figures.map((f) => `      <div class="cl-card"><div class="cl-label">${esc(f.label)}</div><div class="cl-value">${esc(f.value)}</div><div class="cl-note" style="margin:0">${esc(f.note)}</div></div>`).join('\n')}\n    </div>`

  const listings = `<div class="cl-grid">\n${s.listings.map((l) => `      <a class="cl-card${l.here ? ' is-here' : ''}" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer"><span class="cl-place">${esc(l.place)}</span><strong>${esc(l.title)}</strong><span class="cl-value">${esc(l.budget)}</span><span class="cl-more">Voir le projet →</span></a>`).join('\n')}\n    </div>`

  const breakdown = `<ul class="cl-list">\n${s.breakdown.map((b) => `      <li><strong>${esc(b.label)}</strong><span>${esc(b.value)}</span></li>`).join('\n')}\n    </ul>`

  const whyList = `<ul class="cl-points">\n${s.whyPoints.map((p) => `      <li><strong>${esc(p.title)}</strong><span>${esc(p.text)}</span></li>`).join('\n')}\n    </ul>`

  const faq = s.faq.map((f) => (standalone ? `    <details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>` : `    <h3>${esc(f.q)}</h3>\n    <p>${esc(f.a)}</p>`)).join('\n')

  const figure = s.image
    ? `
      <figure class="cimco-photo cl-figure">
        <img src="${esc(s.image.src)}" alt="${esc(s.image.alt)}" ${s.image.width ? `width="${s.image.width}" height="${s.image.height}" ` : ''}loading="eager">${
          s.image.credit ? `\n        <span class="cimco-credit" tabindex="0" role="note" aria-label="Crédit photo">?<span class="cimco-credit-tip">${esc(s.image.credit)}</span></span>` : ''
        }
      </figure>`
    : ''

  const form = `<!-- ${s.ctaComment.replace(/--/g, '-')} -->
    <form class="cl-form" onsubmit="return false;">
      <input type="text" name="nom" placeholder="Nom" aria-label="Nom" autocomplete="name">
      <input type="tel" name="telephone" placeholder="Téléphone" aria-label="Téléphone" autocomplete="tel">
      <input class="cl-full" type="email" name="email" placeholder="E-mail" aria-label="E-mail" autocomplete="email">
      <button class="cl-btn" type="submit">Demander à être rappelé</button>
    </form>
    <p class="cl-reassurance">${esc(s.reassurance)}</p>
    <!-- Emplacement recommandé : widget Avis Google / témoignages clients Cimco -->`

  const band = (mod, inner, id) => `  <section class="cl-band${mod ? ` cl-band--${mod}` : ''}"${id ? ` id="${id}"` : ''}><div class="cl-inner">\n${inner}\n  </div></section>`

  const trustBar = `    <ul class="cl-trust">\n${s.trust.map((t) => `      <li>${TRUST_ICONS[t.icon] || ''}<span><strong>${esc(t.title)}</strong>${esc(t.text)}</span></li>`).join('\n')}\n    </ul>`

  const hero = `    <div class="cl-hero${s.image ? ' has-photo' : ''}">
      <div>
        ${badges}
        <h1>${esc(s.h1)}</h1>
        <p class="cl-lead">${esc(s.intro)}</p>
        ${cta(s.heroCta)}
      </div>${figure}
    </div>`

  // Métadonnées en commentaire en tête du code, pour les reporter dans les paramètres de la page HubSpot
  const metaComment = `<!--\n  Meta Title : ${String(s.metaTitle).replace(/--/g, '-')}\n  Meta Description : ${String(s.metaDescription).replace(/--/g, '-')}\n-->\n`
  const body = `<div class="cimco-local">
${band('', hero)}
${band('trust', trustBar)}
${s.figures.length ? band('alt', `    <h2>${esc(s.figuresTitle)}</h2>\n    ${figures}${note(s.figuresNote)}`) + '\n' : ''}${band('', `    <h2>${esc(s.localTitle)}</h2>\n    <p>${esc(s.local)}</p>\n    ${listings}\n    <p class="cl-more-listings"><a class="cl-btn cl-btn--ghost" href="${esc(s.listingsCta.url)}" target="_blank" rel="noopener noreferrer">${esc(s.listingsCta.label)} →</a></p>`)}
${band('alt', `    <h2>${esc(s.budgetTitle)}</h2>\n    <p>${esc(s.budget)}</p>\n    ${breakdown}\n    <div class="cl-mid"><p>${esc(s.midCtaTitle)}</p>${cta(s.midCta, 'cl-link')}</div>`)}
${band('accent', `    <h2>${esc(s.whyTitle)}</h2>\n    <p>${esc(s.why)}</p>\n    <p class="cl-transparency">${esc(s.whyTransparency)}</p>\n    ${whyList}`)}
${band('', `    <h2>${esc(s.faqTitle)}</h2>\n${faq}`)}
${band('soft', `    <h2>${esc(s.ctaTitle)}</h2>\n    <p>${esc(s.ctaText)}</p>\n    ${form}`, 'contact-cimco')}
</div>`
  if (standalone) return `${metaComment}${STYLE}\n${body}`
  // Export brut : hérite du thème, n'embarque que le style du badge de crédit photo s'il y en a un
  return `${metaComment}${s.image?.credit ? `<style>\n${CREDIT_CSS}\n</style>\n` : ''}${body}`
}
