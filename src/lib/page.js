import { fmtEur, fmtNum } from './data'

// Crédit court : saisi à la main s'il existe (même vide), sinon celui de Wikimedia Commons
export const creditOf = (photo) =>
  photo.creditText !== undefined ? photo.creditText.trim() : photo.manual ? '' : `Photo : ${photo.artist}, licence ${photo.license}`

export const LISTINGS_URL = 'https://cimco.fr/annonces-maisons-terrains'

// ---------- Texte par défaut (données réelles uniquement) ----------

const dvfMain = (dvf) => (dvf?.terrain ? ['terrain', dvf.terrain] : dvf?.maison ? ['maison', dvf.maison] : dvf?.repere ? ['repere', dvf.repere] : null)

const repereText = (r) => `${fmtEur(r.prix_m2_moyen)} le m² (source : ${r.source}, ${r.periode}${r.type_bien ? ', ' + r.type_bien : ''})`

export function buildTemplatePage(c, info, dvf, neighbors) {
  const a = c.annonce
  const pop = info?.population
  const intro =
    `${c.name} (${c.cp}, ${c.depName}) : construisez votre maison avec Cimco.` +
    (pop ? ` Population : ${fmtNum(pop)} habitants (source : geo.api.gouv.fr).` : '')

  let local
  if (a) {
    local = `À ${c.name}, Cimco propose par exemple un projet de maison de ${a.maison_m2} m²${a.terrain_m2 ? ` sur un terrain de ${fmtNum(a.terrain_m2)} m²` : ''} au budget de ${fmtEur(a.budget)}.`
    if (c.nbAnnonces > 1) local = `${c.nbAnnonces} annonces à ${c.name}. ` + local
    if (neighbors.length) local += ` Autres annonces Cimco en ${c.depName} : ${neighbors.map((n) => n.name).join(', ')}.`
  } else {
    local = `Aucune annonce n'est publiée à ${c.name} en ce moment, mais Cimco accompagne vos recherches de terrain sur le secteur.`
    if (neighbors.length) local += ` Projets Cimco à proximité : ${neighbors.map((n) => n.name).join(', ')}.`
  }

  const main = dvfMain(dvf)
  let budget
  if (main?.[0] === 'terrain') {
    const t = main[1]
    budget = `Terrain à bâtir : ${fmtEur(t.prix_m2_moyen)} le m² en moyenne, sur ${t.nb_transactions} vente${t.nb_transactions > 1 ? 's' : ''} (source : ${dvf.source}, ${t.periode}).`
  } else if (main?.[0] === 'maison') {
    const m = main[1]
    budget = `Prix moyen des maisons : ${fmtEur(m.prix_m2_moyen)} le m² habitable en moyenne, terrain inclus, sur ${m.nb_transactions} vente${m.nb_transactions > 1 ? 's' : ''} (source : ${dvf.source}, ${m.periode}).`
  } else if (main?.[0] === 'repere') {
    budget = `Prix immobilier moyen : ${repereText(main[1])}.`
  } else if (a) {
    budget = `À ${c.name}, Cimco propose par exemple un projet de maison au budget de ${fmtEur(a.budget)}.`
  } else {
    budget = `Cimco vous aide à définir votre budget terrain et maison à ${c.name}.`
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
  const dvfLine = (agg, what) => ({
    value: `${fmtEur(agg.prix_m2_moyen)} / m²`,
    note: `${what}, ${agg.nb_transactions} vente${agg.nb_transactions > 1 ? 's' : ''}, ${agg.periode}`,
  })

  // Les cartes dont la donnée est absente sont masquées
  const figures = []
  if (c.population) figures.push({ label: 'Population', value: `${fmtNum(c.population)} habitants`, note: 'Source : geo.api.gouv.fr' })
  if (dvf?.terrain) figures.push({ label: 'Prix moyen des terrains à bâtir', ...dvfLine(dvf.terrain, 'Terrain à bâtir') })
  if (dvf?.maison) figures.push({ label: 'Prix moyen des maisons', ...dvfLine(dvf.maison, 'Maisons, terrain inclus, par m² habitable') })
  if (!dvf?.terrain && !dvf?.maison && dvf?.repere) {
    figures.push({
      label: 'Prix immobilier moyen',
      value: `${fmtEur(dvf.repere.prix_m2_moyen)} / m²`,
      note: `Source : ${dvf.repere.source}, ${dvf.repere.periode}`,
    })
  }
  if (a) figures.push({ label: 'Budget projet Cimco', value: fmtEur(a.budget), note: `Projet de maison de ${a.maison_m2} m²` })

  const listings = (a ? [c, ...neighbors] : neighbors).map((x, i) => ({
    name: x.name,
    here: !!a && i === 0,
    ref: x.annonce.ref,
    url: x.annonce.url || LISTINGS_URL,
    title: `Projet maison ${x.annonce.maison_m2} m²${x.annonce.terrain_m2 ? ` + terrain ${fmtNum(x.annonce.terrain_m2)} m²` : ''} à ${x.name}`,
    budget: fmtEur(x.annonce.budget),
  }))

  const breakdown = []
  if (a?.terrain_m2 && dvf?.terrain) {
    breakdown.push({ label: `Terrain de ${fmtNum(a.terrain_m2)} m² (estimation : surface de l'annonce × prix moyen DVF)`, value: fmtEur(a.terrain_m2 * dvf.terrain.prix_m2_moyen) })
  }
  if (a) breakdown.push({ label: `Projet Cimco (maison ${a.maison_m2} m²${a.terrain_m2 ? ' + terrain' : ''})`, value: fmtEur(a.budget) })

  const annonceTxt = !a ? '' : `Cimco propose par exemple un projet de maison de ${a.maison_m2} m²${a.terrain_m2 ? ` sur un terrain de ${fmtNum(a.terrain_m2)} m²` : ''} au budget de ${fmtEur(a.budget)}`
  const withAnnonce = (txt) => (a ? `${txt} À ${c.name}, ${annonceTxt}.` : txt)
  const faq = [
    dvf?.terrain
      ? {
          q: `Combien coûte un terrain à ${c.name} ?`,
          a: `Le prix moyen constaté est de ${fmtEur(dvf.terrain.prix_m2_moyen)} le m², sur ${dvf.terrain.nb_transactions} vente${dvf.terrain.nb_transactions > 1 ? 's' : ''} de terrains à bâtir (${dvf.terrain.periode}, source : ${dvf.source}).`,
        }
      : {
          q: `Quel budget prévoir pour construire à ${c.name} ?`,
          a: dvf?.maison
            ? withAnnonce(`Les maisons se vendent en moyenne ${fmtEur(dvf.maison.prix_m2_moyen)} le m² habitable, terrain inclus (${dvf.maison.nb_transactions} vente${dvf.maison.nb_transactions > 1 ? 's' : ''}, ${dvf.maison.periode}, source : ${dvf.source}).`)
            : dvf?.repere
              ? withAnnonce(`Le prix immobilier moyen est de ${fmtEur(dvf.repere.prix_m2_moyen)} le m² (source : ${dvf.repere.source}, ${dvf.repere.periode}).`)
              : a
                ? `À ${c.name}, ${annonceTxt}.`
                : `Cimco vous aide à chiffrer votre projet de construction à ${c.name}, en fonction du terrain trouvé.`,
        },
    a
      ? {
          q: `Quelle annonce Cimco est disponible à ${c.name} ?`,
          a: `À ${c.name}, Cimco propose par exemple un projet de maison de ${a.maison_m2} m²${a.terrain_m2 ? ` sur un terrain de ${fmtNum(a.terrain_m2)} m²` : ''} au budget de ${fmtEur(a.budget)}.`,
        }
      : {
          q: `Cimco peut-il m'aider à trouver un terrain à ${c.name} et alentours ?`,
          a: `Oui. Même sans annonce publiée à ${c.name} en ce moment, Cimco accompagne les recherches de terrain sur le secteur et vous présente des projets à proximité.`,
        },
    {
      q: `Cimco accompagne-t-il les projets à ${c.name} ?`,
      a: a
        ? `Oui. Cimco accompagne les projets de construction en Auvergne-Rhône-Alpes, et a une annonce active en ${c.depName}, à ${c.name}.`
        : `Oui. Cimco accompagne les projets de construction en Auvergne-Rhône-Alpes, y compris à ${c.name} et alentours.`,
    },
  ]

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
    image,
    intro: page.intro,
    figuresTitle: `${c.name} en chiffres`,
    figures,
    localTitle: a ? `Annonces Cimco à ${c.name} et alentours` : `Projets Cimco à proximité de ${c.name}`,
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
    ctaTitle: a ? 'Demander à être rappelé' : `Être alerté des prochains terrains à ${c.name}`,
    ctaNote: 'Aperçu de démonstration : à remplacer par le module formulaire HubSpot en production.',
  }
}

export function sectionsText(s) {
  return [
    s.h1, ...(s.image ? [s.image.alt, s.image.credit].filter(Boolean) : []), s.intro, s.figuresTitle,
    ...s.figures.flatMap((f) => [f.label, f.value, f.note]),
    s.localTitle, s.local,
    ...s.listings.flatMap((l) => [l.title, l.budget, `Réf. ${l.ref}`, 'Voir sur cimco.fr →']),
    s.budgetTitle, s.budget,
    ...s.breakdown.flatMap((b) => [b.label, b.value]),
    s.whyTitle, s.why, ...s.whyPoints,
    s.faqTitle, ...s.faq.flatMap((f) => [f.q, f.a]),
    s.ctaTitle, s.ctaNote,
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

const STYLE = `<style>
/* Charte relevée sur cimco.fr (fond #fbfaf8, encre #1a1a18, accent #8fabb9 / #4a6a78) ; si le thème charge déjà Manrope et Poppins, elles s'appliquent d'elles-mêmes */
.cimco-local{--cimco-primary:#4a6a78;--cimco-accent:#8fabb9;--cimco-dark:#1a1a18;--cimco-bg:#fbfaf8;--cimco-alt:#f4f3ef;--cimco-tint:#cfe3ec;--cimco-line:#1a1a1812;color:var(--cimco-dark);background:var(--cimco-bg);font:16px/1.6 "Poppins",system-ui,-apple-system,"Segoe UI",sans-serif}
.cimco-local *{box-sizing:border-box}
.cimco-local h1,.cimco-local h2,.cimco-local h3{font-family:"Manrope",system-ui,-apple-system,sans-serif;letter-spacing:-.01em}
.cimco-local h1{font-size:2.25rem;line-height:1.15;margin:0 0 .75rem}
.cimco-local h2{font-size:1.5rem;line-height:1.25;margin:0 0 1rem}
.cimco-local h2::before{content:"";display:block;width:2.5rem;height:3px;border-radius:3px;background:var(--cimco-accent);margin-bottom:.7rem}
.cimco-local p{margin:0 0 1rem}
.cimco-local .cl-band{padding:3rem 1.5rem}
.cimco-local .cl-inner{max-width:960px;margin:0 auto}
.cimco-local .cl-band--dark{background:var(--cimco-dark);color:#fff}
.cimco-local .cl-band--dark p{color:var(--cimco-tint)}
.cimco-local .cl-band--alt{background:var(--cimco-alt)}
.cimco-local .cl-band--accent{background:var(--cimco-primary);color:#fff}
.cimco-local .cl-band--accent h2::before{background:var(--cimco-tint)}
.cimco-local .cl-band--soft{background:var(--cimco-tint)}
.cimco-local .cl-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem}
.cimco-local .cl-card{border:1px solid var(--cimco-line);border-radius:24px;padding:1.25rem;background:#fff}
.cimco-local a.cl-card{display:block;color:inherit;text-decoration:none;transition:border-color .15s,box-shadow .15s,transform .15s}
.cimco-local a.cl-card:hover{border-color:var(--cimco-primary);box-shadow:0 10px 28px rgba(26,26,24,.12);transform:translateY(-2px)}
.cimco-local .cl-more{font-size:.75rem;color:#57534c;margin-top:.25rem}
.cimco-local .cl-card.is-here{border-color:var(--cimco-primary);box-shadow:inset 0 0 0 1px var(--cimco-primary)}
.cimco-local .cl-label{font-size:.75rem;text-transform:uppercase;letter-spacing:.04em;color:#6b665e}
.cimco-local .cl-value{font-family:"Manrope",system-ui,sans-serif;font-size:1.4rem;font-weight:800;color:var(--cimco-primary)}
.cimco-local .cl-ref{font-size:.75rem;color:#6b665e;margin-top:.5rem}
.cimco-local .cl-figure{margin:1.5rem 0 0}
.cimco-local .cl-figure img{display:block;width:100%;height:auto;max-height:420px;object-fit:cover;border-radius:24px}
${CREDIT_CSS}
.cimco-local .cl-note{font-size:.8rem;color:#6b665e}
.cimco-local ul.cl-list{list-style:none;margin:1rem 0 0;padding:0;background:#fff;border:1px solid var(--cimco-line);border-radius:24px;overflow:hidden}
.cimco-local ul.cl-list li{padding:.85rem 1.25rem;border-top:1px solid var(--cimco-line)}
.cimco-local ul.cl-list li:first-child{border-top:0}
.cimco-local ul.cl-points{list-style:none;margin:1rem 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:.75rem}
.cimco-local ul.cl-points li{background:rgba(255,255,255,.14);border-radius:16px;padding:.9rem 1.1rem;font-weight:600}
.cimco-local details{background:#fff;border:1px solid var(--cimco-line);border-radius:20px;padding:1rem 1.25rem;margin-bottom:.6rem}
.cimco-local summary{cursor:pointer;font-weight:600}
.cimco-local details p{margin:.6rem 0 0;color:#57534c}
.cimco-local .cl-form{display:grid;grid-template-columns:1fr;gap:.75rem}
.cimco-local .cl-form input{width:100%;border:1px solid var(--cimco-line);border-radius:14px;padding:.7rem .9rem;font:inherit;background:#fff}
.cimco-local .cl-form input:focus{outline:2px solid var(--cimco-primary);outline-offset:1px}
.cimco-local .cl-form .cl-full{grid-column:1/-1}
.cimco-local .cl-form button{grid-column:1/-1;border:0;border-radius:999px;padding:.85rem 1rem;font:inherit;font-weight:700;color:#fff;background:var(--cimco-primary);cursor:pointer}
.cimco-local .cl-form button:hover{filter:brightness(.92)}
.cimco-local .cl-demo{font-size:.75rem;color:#57534c;margin:.75rem 0 0}
@media(min-width:600px){.cimco-local .cl-form{grid-template-columns:1fr 1fr}}
</style>`

export function pageToHtml(s, mode = 'raw') {
  const standalone = mode === 'standalone'
  const figures = standalone
    ? `<div class="cl-grid">\n${s.figures.map((f) => `    <div class="cl-card"><div class="cl-label">${esc(f.label)}</div><div class="cl-value">${esc(f.value)}</div><div class="cl-note">${esc(f.note)}</div></div>`).join('\n')}\n  </div>`
    : `<ul>\n${s.figures.map((f) => `    <li><strong>${esc(f.label)} :</strong> ${esc(f.value)} (${esc(f.note)})</li>`).join('\n')}\n  </ul>`

  const listings = standalone
    ? `<div class="cl-grid">\n${s.listings.map((l) => `    <a class="cl-card${l.here ? ' is-here' : ''}" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer"><div><strong>${esc(l.title)}</strong></div><div class="cl-value">${esc(l.budget)}</div><div class="cl-ref">Réf. ${esc(l.ref)}</div><div class="cl-more">Voir sur cimco.fr →</div></a>`).join('\n')}\n  </div>`
    : `<ul>\n${s.listings.map((l) => `    <li><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer"><strong>${esc(l.title)}</strong></a> : ${esc(l.budget)} <small>(Réf. ${esc(l.ref)})</small> <a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">Voir sur cimco.fr →</a></li>`).join('\n')}\n  </ul>`

  const faq = standalone
    ? s.faq.map((f) => `  <details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n')
    : s.faq.map((f) => `  <h3>${esc(f.q)}</h3>\n  <p>${esc(f.a)}</p>`).join('\n')

  const figure = s.image
    ? `
  <figure class="cimco-photo${standalone ? ' cl-figure' : ''}">
    <img src="${esc(s.image.src)}" alt="${esc(s.image.alt)}" ${s.image.width ? `width="${s.image.width}" height="${s.image.height}" ` : ''}loading="lazy">${
      s.image.credit ? `\n    <span class="cimco-credit" tabindex="0" role="note" aria-label="Crédit photo">?<span class="cimco-credit-tip">${esc(s.image.credit)}</span></span>` : ''
    }
  </figure>`
    : ''
  // Sans CSS dans le thème, l'export brut embarque uniquement le style du badge (et seulement s'il y a un crédit)
  const creditStyle = !standalone && s.image?.credit ? `<style>\n${CREDIT_CSS}\n</style>\n` : ''

  const breakdown = s.breakdown.length
    ? `  <ul${standalone ? ' class="cl-list"' : ''}>\n${s.breakdown.map((b) => `    <li>${esc(b.label)} : <strong>${esc(b.value)}</strong></li>`).join('\n')}\n  </ul>`
    : ''

  const whyList = standalone
    ? `<ul class="cl-points">\n${s.whyPoints.map((p) => `      <li>${esc(p)}</li>`).join('\n')}\n    </ul>`
    : `<ul>\n${s.whyPoints.map((p) => `    <li>${esc(p)}</li>`).join('\n')}\n  </ul>`

  const form = standalone
    ? `<form class="cl-form" onsubmit="return false;">
      <input type="text" name="nom" placeholder="Nom" aria-label="Nom">
      <input type="tel" name="telephone" placeholder="Téléphone" aria-label="Téléphone">
      <input class="cl-full" type="email" name="email" placeholder="E-mail" aria-label="E-mail">
      <button type="submit">Demander à être rappelé</button>
    </form>
    <p class="cl-demo">${esc(s.ctaNote)}</p>`
    : `<form onsubmit="return false;">
      <p><input type="text" name="nom" placeholder="Nom" aria-label="Nom"></p>
      <p><input type="tel" name="telephone" placeholder="Téléphone" aria-label="Téléphone"></p>
      <p><input type="email" name="email" placeholder="E-mail" aria-label="E-mail"></p>
      <p><button type="submit">Demander à être rappelé</button></p>
    </form>
    <p><small>${esc(s.ctaNote)}</small></p>`

  const band = (mod, inner) => `  <section class="cl-band${mod ? ` cl-band--${mod}` : ''}"><div class="cl-inner">\n${inner}\n  </div></section>`

  if (standalone) {
    const body = `<div class="cimco-local">
${band('dark', `    <h1>${esc(s.h1)}</h1>\n    <p>${esc(s.intro)}</p>${figure}`)}
${s.figures.length ? band('', `    <h2>${esc(s.figuresTitle)}</h2>\n    ${figures}`) + '\n' : ''}${band('alt', `    <h2>${esc(s.localTitle)}</h2>\n    <p>${esc(s.local)}</p>\n    ${listings}`)}
${band('', `    <h2>${esc(s.budgetTitle)}</h2>\n    <p>${esc(s.budget)}</p>\n${breakdown}`)}
${band('accent', `    <h2>${esc(s.whyTitle)}</h2>\n    <p>${esc(s.why)}</p>\n    ${whyList}`)}
${band('alt', `    <h2>${esc(s.faqTitle)}</h2>\n${faq}`)}
${band('soft', `    <h2>${esc(s.ctaTitle)}</h2>\n    ${form}`)}
</div>`
    return `${STYLE}\n${body}`
  }

  const body = `<div class="cimco-local">
  <h1>${esc(s.h1)}</h1>${figure}
  <p>${esc(s.intro)}</p>

${s.figures.length ? `  <h2>${esc(s.figuresTitle)}</h2>\n  ${figures}\n\n` : ''}  <h2>${esc(s.localTitle)}</h2>
  <p>${esc(s.local)}</p>
  ${listings}

  <h2>${esc(s.budgetTitle)}</h2>
  <p>${esc(s.budget)}</p>
${breakdown}

  <h2>${esc(s.whyTitle)}</h2>
  <p>${esc(s.why)}</p>
  ${whyList}

  <h2>${esc(s.faqTitle)}</h2>
${faq}

  <div>
    <h2>${esc(s.ctaTitle)}</h2>
    ${form}
  </div>
</div>`
  return `${creditStyle}${body}`
}
