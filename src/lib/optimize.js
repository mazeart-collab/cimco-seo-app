const MAX_WIDTH = 1200
const QUALITIES = [0.82, 0.75, 0.68, 0.6]
const FALLBACK_WIDTHS = [1000, 800, 640] // dernier recours si 100 Ko ne tient pas à la qualité 0.60
export const MAX_BYTES = 100 * 1024

export const slugify = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const seoFileName = (commune, dep) => `faire-construire-${slugify(commune)}-${dep}.webp`

// Récupération directe (Wikimedia autorise le CORS), sinon via le relais serveur
async function loadBlob(url) {
  try {
    const r = await fetch(url, { mode: 'cors' })
    if (r.ok) return await r.blob()
  } catch {
    /* CORS bloqué : on passe par le relais */
  }
  const r = await fetch(`/api/image-proxy?url=${encodeURIComponent(url)}`)
  if (!r.ok) throw new Error('proxy ' + r.status)
  return r.blob()
}

const encode = (bitmap, width, quality) => {
  const height = Math.round((bitmap.height * width) / bitmap.width)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, width, height)
  return new Promise((resolve) => canvas.toBlob((blob) => resolve({ blob, width, height, quality }), 'image/webp', quality))
}

// Redimensionne (1200 px max, sans agrandir) et exporte en WebP, en visant 100 Ko maximum :
// qualité 0.82, puis 0.75, 0.68, 0.60 ; si ce n'est pas assez, la largeur est réduite à qualité 0.60.
export async function optimizeImage(url) {
  const source = await loadBlob(url)
  const bitmap = await createImageBitmap(source)
  const full = Math.min(1200, bitmap.width)
  const attempts = [...QUALITIES.map((q) => [full, q]), ...FALLBACK_WIDTHS.filter((w) => w < full).map((w) => [w, 0.6])]
  let result
  for (const [w, q] of attempts) {
    result = await encode(bitmap, w, q)
    if (!result.blob || result.blob.type !== 'image/webp') throw new Error('webp_non_supporte')
    if (result.blob.size <= MAX_BYTES) break
  }
  bitmap.close?.()
  return { ...result, originalSize: source.size, underLimit: result.blob.size <= MAX_BYTES }
}

export function download(blob, filename) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export const formatKo = (bytes) => `${new Intl.NumberFormat('fr-FR').format(Math.max(1, Math.round(bytes / 1024)))} Ko`
