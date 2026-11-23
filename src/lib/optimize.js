const MAX_WIDTH = 1200
const QUALITY = 0.82

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

// Redimensionne (1200 px max, sans agrandir) et exporte en WebP qualité 0.82
export async function optimizeImage(url) {
  const source = await loadBlob(url)
  const bitmap = await createImageBitmap(source)
  const width = Math.min(MAX_WIDTH, bitmap.width)
  const height = Math.round((bitmap.height * width) / bitmap.width)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', QUALITY))
  if (!blob || blob.type !== 'image/webp') throw new Error('webp_non_supporte')
  return { blob, width, height, originalSize: source.size }
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
