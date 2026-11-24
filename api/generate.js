// Fonction serveur : la clé ANTHROPIC_API_KEY reste côté serveur, jamais dans le code client.
// Sans clé, ou en cas d'échec, le client bascule sur le template construit à partir des données réelles.
//
// Garde-fous de coût (un appel = au plus une requête Anthropic, aucun nouvel essai) :
// - sortie bornée par MAX_OUTPUT_TOKENS (réflexion comprise) ;
// - entrée bornée champ par champ et au total (MAX_PROMPT_CHARS) ;
// - limite d'appels par IP et par jour, plus un plafond global par jour ;
// - plafond de dépense mensuel à régler dans la console Anthropic.
const MODEL = 'claude-opus-5-5'
const MAX_OUTPUT_TOKENS = 4000
const PER_IP_DAILY = 20
const GLOBAL_DAILY = 200
const MAX_PROMPT_CHARS = 12000

// Compteurs : Upstash Redis si configuré (persistant entre redémarrages et instances),
// sinon en mémoire (remis à zéro à chaque démarrage à froid de la fonction).
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
const counters = { day: '', global: 0, ips: new Map() }

function memoryLimit(ip, day) {
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

async function redisLimit(ip, day) {
  const ipKey = `gen:${day}:ip:${ip}`
  const globalKey = `gen:${day}:global`
  const r = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: { authorization: `Bearer ${REDIS_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify([
      ['INCR', ipKey],
      ['EXPIRE', ipKey, '172800'],
      ['INCR', globalKey],
      ['EXPIRE', globalKey, '172800'],
    ]),
    signal: AbortSignal.timeout(3000),
  })
  if (!r.ok) throw new Error('redis_' + r.status)
  const [ipCount, , globalCount] = (await r.json()).map((x) => Number(x.result))
  return ipCount <= PER_IP_DAILY && globalCount <= GLOBAL_DAILY
}

async function checkLimit(ip) {
  const day = new Date().toISOString().slice(0, 10)
  if (REDIS_URL && REDIS_TOKEN) {
    try {
      return await redisLimit(ip, day)
    } catch (e) {
      console.error('Compteur Redis indisponible, repli en mémoire :', e.message)
    }
  }
  return memoryLimit(ip, day)
}

const short = (v, max) => String(v ?? '').slice(0, max)
// Garde un objet JSON seulement s'il reste sous une taille donnée, sinon null
const capJson = (v, max) => {
  if (v == null || typeof v !== 'object') return null
  try {
    return JSON.stringify(v).length <= max ? v : null
  } catch {
    return null
  }
}

const SYSTEM = `Tu rédiges des pages SEO locales "Faire construire à [commune]" pour cimco.fr, courtier en construction de maisons individuelles basé à Vourles (Auvergne-Rhône-Alpes).
Règles strictes :
- Utilise UNIQUEMENT les données fournies dans le JSON. N'invente aucun chiffre, prix, témoignage, nom de lieu ou fait sur la commune.
- Tout chiffre repris doit être accompagné de sa source et de sa période quand elles sont fournies.
- Les prix DVF sont des moyennes par commune, jamais des ventes individuelles.
- Si annonce_cimco est null, il n'y a pas d'annonce publiée dans la commune : le dire positivement, indiquer que Cimco accompagne les recherches de terrain sur le secteur, et citer les annonces voisines fournies.
- Ne cite jamais les codes de référence internes des annonces dans le texte rédigé.
- Français naturel, sans tirets cadratins.
- Le texte doit être propre à la commune : appuie-toi sur ses données (annonce, population, prix moyen, annonces voisines du département).
Réponds uniquement avec un objet JSON : {"intro": string, "local": string, "budget": string} (chaque valeur : un paragraphe de 2 à 4 phrases).`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) return res.status(503).json({ error: 'no_key' })

  const b = req.body && typeof req.body === 'object' ? req.body : {}
  const annonce = b.commune?.annonce && typeof b.commune.annonce === 'object'
    ? Object.fromEntries(Object.entries(b.commune.annonce).filter(([k]) => k !== 'ref'))
    : null
  const pop = Number(b.commune?.population)
  const data = {
    commune: short(b.commune?.name, 80),
    code_postal: short(b.commune?.cp, 10),
    departement: short(b.commune?.depName, 40),
    population: Number.isFinite(pop) ? pop : null,
    annonce_cimco: capJson(annonce, 2000),
    annonces_voisines_departement: Array.isArray(b.commune?.neighbors) ? b.commune.neighbors.slice(0, 8).map((x) => short(x, 60)) : [],
    dvf: capJson(b.dvf, 3000),
  }
  if (!data.commune) return res.status(400).json({ error: 'commune_manquante' })

  const instructions = short(b.instructions, 1500)
  const current = b.current
    ? JSON.stringify({ intro: short(b.current.intro, 2000), local: short(b.current.local, 2000), budget: short(b.current.budget, 2000) })
    : null

  const user = [
    `Données de la commune :\n${JSON.stringify(data)}`,
    current ? `Texte actuel à modifier :\n${current}` : '',
    instructions ? `Consignes de l'éditeur :\n${instructions}` : 'Pas de consigne particulière.',
  ]
    .filter(Boolean)
    .join('\n\n')
  if (user.length > MAX_PROMPT_CHARS) return res.status(413).json({ error: 'entree_trop_longue' })

  // Le quota n'est décompté que pour une requête valide, juste avant l'appel payant
  const ip = short(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown', 80).split(',')[0].trim()
  if (!(await checkLimit(ip))) {
    return res.status(429).json({ error: 'rate_limited', message: 'Limite quotidienne de générations atteinte. Réessayez demain.' })
  }

  // Un seul appel, sans nouvel essai automatique
  let msg
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'server-side-fallback-2026-07-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        fallbacks: 'default',
        output_config: { effort: 'low' },
        system: SYSTEM,
        messages: [{ role: 'user', content: user }],
      }),
      signal: AbortSignal.timeout(55000),
    })
    if (!r.ok) {
      const errText = await r.text()
      console.error('Anthropic API error:', r.status, errText)
      return res.status(502).json({ error: 'upstream_' + r.status, status: r.status, detail: errText.slice(0, 500) })
    }
    msg = await r.json()
  } catch (e) {
    return res.status(502).json({ error: String(e.name === 'TimeoutError' ? 'timeout' : e.message || 'generation_failed').slice(0, 40) })
  }

  if (msg.stop_reason === 'refusal') return res.status(502).json({ error: 'refusal' })
  if (msg.usage) console.log('Anthropic usage:', JSON.stringify(msg.usage))
  const text = (msg.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('')
  let parsed = null
  try {
    const match = text.match(/\{[\s\S]*\}/)
    parsed = match ? JSON.parse(match[0]) : null
  } catch {
    parsed = null
  }
  if (!parsed?.intro || !parsed?.local || !parsed?.budget) {
    return res.status(502).json({ error: msg.stop_reason === 'max_tokens' ? 'sortie_tronquee' : 'bad_output' })
  }
  return res.status(200).json({
    page: { intro: short(parsed.intro, 2000), local: short(parsed.local, 2000), budget: short(parsed.budget, 2000) },
  })
}
