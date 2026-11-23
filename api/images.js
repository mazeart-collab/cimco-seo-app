// Propose 4 à 6 photos réelles d'une commune (Wikipédia FR + Wikimedia Commons), sans clé API.
const UA = 'CimcoSEOLocal/1.0'
const TIMEOUT_MS = 8000
const MAX = 6
const EXCLUDED = [
  'blason', 'coat', 'map', 'carte', 'logo', 'flag', 'localisation', 'icon', 'drapeau', 'armoiries', 'panneau', 'locator',
  'sols', 'occupation', 'hydro', 'geologie', 'schema', 'diagram', 'commune-', 'population', 'demographie',
]
// "plan" en mot entier, pour ne pas exclure "plaine" ou "planches"
const PLAN = /(^|[^a-z])plan([^a-z]|$)/
const MIMES = ['image/jpeg', 'image/png', 'image/webp']

const log = (level, event, extra = {}) => console[level](JSON.stringify({ fn: 'images', event, ...extra }))
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const strip = (html) => String(html || '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim()

async function api(host, params) {
  const url = `https://${host}/w/api.php?${new URLSearchParams({ format: 'json', ...params })}`
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!r.ok) throw new Error(`${host} ${r.status}`)
  return r.json()
}

const IIPROPS = { prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1000' }

// 1. Image principale de l'article Wikipédia FR (essaie "Commune (Département)" si la page est une homonymie)
async function mainImage(name, depName) {
  for (const title of [name, `${name} (${depName})`]) {
    const d = await api('fr.wikipedia.org', {
      action: 'query', titles: title, prop: 'pageimages|pageprops', ppprop: 'disambiguation',
      piprop: 'original|thumbnail|name', pithumbsize: '1200', redirects: '1',
    })
    const page = Object.values(d.query?.pages || {})[0]
    if (!page || page.missing !== undefined || page.pageprops?.disambiguation !== undefined) continue
    if (page.pageimage) return `File:${page.pageimage}`
    return null
  }
  return null
}

async function commonsInfoByTitle(title) {
  const d = await api('commons.wikimedia.org', { action: 'query', titles: title, ...IIPROPS })
  return Object.values(d.query?.pages || {})
}

// 2. Fichiers de la catégorie Commons de la commune ; renvoie { members, pages }
async function categoryFiles(name, depName) {
  for (const cat of [`Category:${name} (${depName})`, `Category:${name}`]) {
    const d = await api('commons.wikimedia.org', {
      action: 'query', generator: 'categorymembers', gcmtitle: cat, gcmtype: 'file', gcmlimit: '15', ...IIPROPS,
    })
    const pages = Object.values(d.query?.pages || {})
    if (pages.length) return pages
  }
  return []
}

// 3. Uniquement si la catégorie est vide : recherche restreinte au titre du fichier
async function searchFiles(name) {
  const d = await api('commons.wikimedia.org', {
    action: 'query', generator: 'search', gsrnamespace: '6', gsrsearch: `intitle:"${name}" filetype:bitmap`, gsrlimit: '15', ...IIPROPS,
  })
  return Object.values(d.query?.pages || {})
}

const isExcluded = (text) => {
  const t = String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/_/g, ' ')
  return EXCLUDED.some((w) => t.includes(w)) || PLAN.test(t)
}

export function pickPhotos(pages) {
  const res = []
  const seen = new Set()
  for (const p of pages) {
    const ii = p.imageinfo?.[0]
    if (!ii || !MIMES.includes(ii.mime) || seen.has(p.title)) continue
    if (!(ii.width >= 600) || !(ii.width > ii.height)) continue
    const title = String(p.title || '')
    const meta = ii.extmetadata || {}
    const description = strip(meta.ImageDescription?.value)
    if (isExcluded(title) || isExcluded(description)) continue
    seen.add(p.title)
    const cleanTitle = title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '').replace(/_/g, ' ')
    res.push({
      url: ii.thumburl || ii.url,
      width: ii.thumbwidth || ii.width,
      height: ii.thumbheight || ii.height,
      title: cleanTitle,
      legend: description && description.length <= 140 ? description : cleanTitle,
      artist: strip(meta.Artist?.value) || 'Auteur non renseigné',
      license: strip(meta.LicenseShortName?.value) || 'Licence non renseignée',
      licenseUrl: strip(meta.LicenseUrl?.value) || null,
      pageUrl: ii.descriptionurl,
      area: ii.width * ii.height,
    })
  }
  return res
}

export default async function handler(req, res) {
  const name = String(req.query.commune || '').slice(0, 80)
  const depName = String(req.query.dep_name || '').slice(0, 40)
  if (!name) return res.status(400).json({ error: 'commune manquante' })

  try {
    const step = async (label, fn) => {
      try {
        return await fn()
      } catch (e) {
        log('warn', label + '_failed', { name, message: String(e?.message || e) })
        return null
      }
    }

    // Ordre strict : image principale Wikipédia, puis catégorie Commons, puis recherche (si catégorie vide)
    const mainTitle = await step('wikipedia', () => mainImage(name, depName))
    const mainPages = mainTitle ? (await step('main_info', () => commonsInfoByTitle(mainTitle))) || [] : []
    const category = await step('category', () => categoryFiles(name, depName))
    let rest = category || []
    if (category && !category.length) rest = (await step('search', () => searchFiles(name))) || []

    if (mainTitle === null && category === null) return res.status(503).json({ error: 'wikimedia_indisponible' })

    const main = pickPhotos(mainPages)
    const others = pickPhotos(rest).sort((a, b) => b.area - a.area)
    const photos = [...main, ...others.filter((o) => !main.some((m) => m.title === o.title))].slice(0, MAX).map(({ area, ...r }) => r)
    log('info', 'done', { name, principale: main.length, categorie: (category || []).length, retenues: photos.length })

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
    return res.status(200).json({ commune: name, photos })
  } catch (e) {
    log('error', 'failed', { name, message: String(e?.message || e) })
    return res.status(503).json({ error: 'wikimedia_indisponible' })
  }
}
