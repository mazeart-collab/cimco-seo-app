// Relais d'image pour l'optimisation côté navigateur (évite les blocages CORS).
// Protections : https uniquement, pas d'adresses privées (anti-SSRF), type image/*, 10 Mo maximum.
import { lookup } from 'node:dns/promises'
import net from 'node:net'

const MAX_BYTES = 10 * 1024 * 1024
const TIMEOUT_MS = 10000
const MAX_REDIRECTS = 3

const log = (level, event, extra = {}) => console[level](JSON.stringify({ fn: 'image-proxy', event, ...extra }))

export function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number)
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
  }
  const v = ip.toLowerCase()
  if (v.startsWith('::ffff:')) return isPrivateIp(v.slice(7))
  return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80')
}

async function assertPublic(u) {
  if (u.protocol !== 'https:') throw new Error('https_requis')
  if (u.port && u.port !== '443') throw new Error('port_interdit')
  const host = u.hostname.replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) throw new Error('hote_interdit')
  const addrs = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true })
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error('adresse_privee')
}

export default async function handler(req, res) {
  let target
  try {
    target = new URL(String(req.query.url || ''))
  } catch {
    return res.status(400).json({ error: 'url_invalide' })
  }

  try {
    let r
    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      await assertPublic(target)
      r = await fetch(target, { redirect: 'manual', headers: { 'User-Agent': 'CimcoSEOLocal/1.0', Accept: 'image/*' }, signal: AbortSignal.timeout(TIMEOUT_MS) })
      if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
        target = new URL(r.headers.get('location'), target)
        continue
      }
      break
    }
    if (!r.ok) return res.status(502).json({ error: 'source_http_' + r.status })
    const type = (r.headers.get('content-type') || '').split(';')[0].trim()
    if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(type)) return res.status(415).json({ error: 'type_non_image' })
    const declared = Number(r.headers.get('content-length') || 0)
    if (declared > MAX_BYTES) return res.status(413).json({ error: 'image_trop_lourde' })
    const buf = Buffer.from(await r.arrayBuffer())
    if (buf.length > MAX_BYTES) return res.status(413).json({ error: 'image_trop_lourde' })

    res.setHeader('Content-Type', type)
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
    return res.status(200).send(buf)
  } catch (e) {
    log('warn', 'failed', { host: target.hostname, message: String(e?.message || e) })
    return res.status(502).json({ error: 'proxy_echec' })
  }
}
