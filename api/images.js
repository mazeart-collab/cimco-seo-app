// Propose 4 à 6 photos réelles d'une commune (Wikipédia FR + Wikimedia Commons), sans clé API.
const UA = 'CimcoSEOLocal/1.0'
const TIMEOUT_MS = 8000
const MAX = 6
const EXCLUDED = ['blason', 'coat', 'map', 'carte', 'logo', 'flag', 'localisation', 'icon', 'drapeau', 'armoiries', 'panneau', 'locator']
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

const toFile = (t) => t.replace(/^(Fichier|File):/i, 'File:')

// Fichiers présents sur la page Wikipédia de la commune
async function wikipediaFiles(name, depName) {
  const s = await api('fr.wikipedia.org', { action: 'query', list: 'search', srsearch: `${name} commune ${depName}`, srlimit: '5' })
  const target = norm(name)
  const hit = (s.query?.search || []).find((x) => norm(x.title).startsWith(target))
  if (!hit) return []
  const p = await api('fr.wikipedia.org', { action: 'query', titles: hit.title, prop: 'images', imlimit: '60' })
  const page = Object.values(p.query?.pages || {})[0]
  return (page?.images || []).map((i) => toFile(i.title))
}

async function commonsFiles(name, depName) {
  const s = await api('commons.wikimedia.org', { action: 'query', list: 'search', srsearch: `${name} ${depName}`, srnamespace: '6', srlimit: '30' })
  return (s.query?.search || []).map((x) => x.title)
}

async function imageInfo(titles) {
  const out = []
  for (let i = 0; i < titles.length; i += 40) {
    const d = await api('commons.wikimedia.org', {
      action: 'query',
      titles: titles.slice(i, i + 40).join('|'),
      prop: 'imageinfo',
      iiprop: 'url|size|mime|extmetadata',
      iiurlwidth: '1000',
    })
    out.push(...Object.values(d.query?.pages || {}))
  }
  return out
}

export function pickPhotos(pages, name, fromWikipedia) {
  const target = norm(name)
  const res = []
  for (const p of pages) {
    const ii = p.imageinfo?.[0]
    if (!ii || !MIMES.includes(ii.mime)) continue
    if (!(ii.width >= 600) || !(ii.width > ii.height)) continue
    const title = String(p.title || '')
    if (EXCLUDED.some((w) => norm(title).includes(w))) continue
    const meta = ii.extmetadata || {}
    const description = strip(meta.ImageDescription?.value)
    // Pertinence : fichier de la page Wikipédia de la commune, ou nom de la commune dans le titre / la description
    const relevant = fromWikipedia.has(title) || norm(title).includes(target) || norm(description).includes(target)
    if (!relevant) continue
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
      wikipedia: fromWikipedia.has(title),
      area: ii.width * ii.height,
    })
  }
  // Photos de la page Wikipédia d'abord, puis les plus grandes
  return res.sort((a, b) => Number(b.wikipedia) - Number(a.wikipedia) || b.area - a.area).slice(0, MAX).map(({ wikipedia, area, ...r }) => r)
}

export default async function handler(req, res) {
  const name = String(req.query.commune || '').slice(0, 80)
  const depName = String(req.query.dep_name || '').slice(0, 40)
  if (!name) return res.status(400).json({ error: 'commune manquante' })

  try {
    const [w, c] = await Promise.allSettled([wikipediaFiles(name, depName), commonsFiles(name, depName)])
    if (w.status === 'rejected') log('warn', 'wikipedia_failed', { name, message: String(w.reason?.message || w.reason) })
    if (c.status === 'rejected') log('warn', 'commons_failed', { name, message: String(c.reason?.message || c.reason) })
    if (w.status === 'rejected' && c.status === 'rejected') return res.status(503).json({ error: 'wikimedia_indisponible' })

    const wiki = w.status === 'fulfilled' ? w.value : []
    const common = c.status === 'fulfilled' ? c.value : []
    const titles = [...new Set([...wiki, ...common])].filter((t) => !/\.svg$/i.test(t))
    const photos = titles.length ? pickPhotos(await imageInfo(titles), name, new Set(wiki)) : []
    log('info', 'done', { name, candidats: titles.length, retenues: photos.length })

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
    return res.status(200).json({ commune: name, photos })
  } catch (e) {
    log('error', 'failed', { name, message: String(e?.message || e) })
    return res.status(503).json({ error: 'wikimedia_indisponible' })
  }
}
