// Fonction serveur : la clé ANTHROPIC_API_KEY reste côté serveur, jamais dans le code client.
const MODEL = 'claude-opus-5-5'
const PER_IP_DAILY = 20
const GLOBAL_DAILY = 200

// Compteurs en mémoire (limite de base par instance serverless ; la limite de dépense se règle dans la console Anthropic)
const counters = { day: '', global: 0, ips: new Map() }

function checkLimit(ip) {
  const day = new Date().toISOString().slice(0, 10)
  if (counters.day !== day) {
    counters.day = day
    counters.global = 0
    counters.ips = new Map()
  }
  const n = counters.ips.get(ip) || 0
  if (n >= PER_IP_DAILY || counters.global >= GLOBAL_DAILY) return false
  counters.ips.set(ip, n + 1)
  counters.global++
  return true
}

const short = (v, max) => String(v ?? '').slice(0, max)

const SYSTEM = `Tu rédiges des pages SEO locales "Faire construire à [commune]" pour cimco.fr, courtier en construction de maisons individuelles basé à Vourles (Auvergne-Rhône-Alpes).
Règles strictes :
- Utilise UNIQUEMENT les données fournies dans le JSON. N'invente aucun chiffre, prix, témoignage, nom de lieu ou fait sur la commune.
- Tout chiffre repris doit être accompagné de sa source et de sa période quand elles sont fournies.
- Les prix DVF sont des moyennes par commune, jamais des ventes individuelles.
- Français naturel, sans tirets cadratins.
- Le texte doit être propre à la commune : appuie-toi sur ses données (annonce, population, prix moyen, annonces voisines du département).
Réponds uniquement avec un objet JSON : {"intro": string, "local": string, "budget": string} (chaque valeur : un paragraphe de 2 à 4 phrases).`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return res.status(503).json({ error: 'no_key' })

  const ip = short(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown', 80).split(',')[0].trim()
  if (!checkLimit(ip)) {
    return res.status(429).json({ error: 'rate_limited', message: 'Limite quotidienne de générations atteinte. Réessayez demain.' })
  }

  const b = req.body || {}
  const data = {
    commune: short(b.commune?.name, 80),
    code_postal: short(b.commune?.cp, 10),
    departement: short(b.commune?.depName, 40),
    population: b.commune?.population ?? null,
    annonce_cimco: b.commune?.annonce ?? null,
    annonces_voisines_departement: Array.isArray(b.commune?.neighbors) ? b.commune.neighbors.slice(0, 8).map((x) => short(x, 60)) : [],
    dvf: b.dvf ?? null,
  }
  const instructions = short(b.instructions, 1500)
  const current = b.current ? JSON.stringify(b.current).slice(0, 4000) : null

  const user = [
    `Données de la commune :\n${JSON.stringify(data)}`,
    current ? `Texte actuel à modifier :\n${current}` : '',
    instructions ? `Consignes de l'éditeur :\n${instructions}` : 'Pas de consigne particulière.',
  ]
    .filter(Boolean)
    .join('\n\n')

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'server-side-fallback-2026-07-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        fallbacks: 'default',
        output_config: { effort: 'low' },
        system: SYSTEM,
        messages: [{ role: 'user', content: user }],
      }),
      signal: AbortSignal.timeout(55000),
    })
    if (!r.ok) return res.status(502).json({ error: 'upstream_' + r.status })
    const msg = await r.json()
    if (msg.stop_reason === 'refusal') return res.status(502).json({ error: 'refusal' })
    const text = (msg.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('')
    const match = text.match(/\{[\s\S]*\}/)
    const parsed = match ? JSON.parse(match[0]) : null
    if (!parsed?.intro || !parsed?.local || !parsed?.budget) return res.status(502).json({ error: 'bad_output' })
    return res.status(200).json({
      page: { intro: short(parsed.intro, 2000), local: short(parsed.local, 2000), budget: short(parsed.budget, 2000) },
    })
  } catch {
    return res.status(502).json({ error: 'generation_failed' })
  }
}
