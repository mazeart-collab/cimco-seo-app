// Fonction serveur : la clé ANTHROPIC_API_KEY reste côté serveur, jamais dans le code client.
// Sans clé, ou en cas d'échec, le client bascule sur le template construit à partir des données réelles.
//
// Garde-fous de coût (un appel = au plus une requête Anthropic, aucun nouvel essai) :
// - sortie bornée par MAX_OUTPUT_TOKENS (réflexion comprise) ;
// - entrée bornée champ par champ et au total (MAX_PROMPT_CHARS) ;
// - limite d'appels par IP et par jour, plus un plafond global par jour ;
// - plafond de dépense mensuel à régler dans la console Anthropic.
const MODEL = 'claude-sonnet-5-5'
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

const SYSTEM = `Tu es un rédacteur SEO expert de la construction de maisons individuelles. Tu écris des pages locales "Faire construire à [commune]" pour cimco.fr, courtier en construction de maisons individuelles indépendant depuis 2009, basé à Vourles (Auvergne-Rhône-Alpes).

Ton : expert, fluide, rassurant, orienté acheteur. Tu t'adresses directement au futur propriétaire (vous). Zéro ton administratif, zéro formule creuse ("en effet", "il est important de noter"). Français naturel, phrases variées, sans tirets cadratins.

Exactitude (règle absolue) :
- Tous les chiffres (prix, surfaces, budgets, population, nombre de ventes, dates) viennent UNIQUEMENT du JSON fourni. N'invente aucun chiffre, prix, témoignage, avis client ni annonce.
- Les prix DVF sont des moyennes par commune : ne parle jamais de ventes individuelles.
- Ancrage local : tu peux décrire la situation géographique de la commune, les grands axes routiers, les villes et bassins d'emploi proches, le cadre de vie et les spécificités pour faire construire sur ce secteur (relief, type de terrains, caractère rural ou périurbain), uniquement à partir de connaissances générales dont tu es certain. Aucune statistique, distance chiffrée ou durée de trajet. En cas de doute, reste général.
- Si annonce_cimco est null, aucune annonce n'est publiée dans la commune : dis-le positivement, explique que Cimco accompagne la recherche de terrain sur le secteur et cite les autres annonces fournies.

Sources : ne cite JAMAIS de nom de source ou d'outil technique dans le texte (pas de "geo.api.gouv.fr", "DVF", "DGFiP", "geo-dvf", "data.gouv.fr", "INSEE", "Meilleurs Agents"). Écris par exemple "le prix moyen constaté des terrains à bâtir". Les sources sont affichées à part, en note de bas de bloc.

Zéro répétition :
- La page affiche déjà, dans des cartes chiffrées, la population, les prix moyens au m² avec leur nombre de ventes et leur période, et le budget des annonces Cimco.
- Dans l'ensemble de ton texte (intro, local, budget, faq), chaque chiffre apparaît AU PLUS UNE FOIS. Ne répète jamais une surface, un prix exact, un nombre de ventes ou une période d'une section à l'autre.
- Chaque section apporte un angle neuf : intro = promesse et projet de vie dans la commune ; local = ancrage géographique et projets Cimco dans la commune ou ailleurs dans le département ; budget = structure d'un budget global ; faq = réponses pratiques.
- Ne cite jamais les codes de référence internes des annonces.

Contenu attendu :
- "intro" : 2 à 3 phrases d'accroche qui donnent envie de faire construire dans cette commune et présentent Cimco comme le partenaire du projet.
- "local" : 3 à 5 phrases d'ancrage local (situation, axes, bassins d'emploi, cadre de vie, particularités du foncier), puis l'annonce Cimco de la commune et les autres annonces fournies.
- Autres annonces (autres_annonces_cimco, au format "Commune (Département)") : elles peuvent se trouver à plusieurs dizaines de kilomètres. Ne les présente jamais comme "alentours", "à proximité", "voisines" ou "dans le secteur". Écris "ailleurs dans le département" (ou "ailleurs en Auvergne-Rhône-Alpes" si leur département diffère de celui de la commune) et cite leur nom.
- "budget" : 3 à 5 phrases sur la structure d'un budget global de construction : le terrain (prix d'achat et frais de notaire), la maison (contrat de construction de maison individuelle, CCMI, avec ses garanties : prix ferme, délais, garantie de livraison, dommages-ouvrage), et les frais annexes (viabilisation, raccordements aux réseaux, étude de sol, taxe d'aménagement). Tu peux situer le terrain par rapport au prix moyen local si la donnée existe. Ne calcule jamais le prix d'un terrain en multipliant une surface par un prix moyen.
- "faq" : exactement 5 questions qu'un vrai futur propriétaire se pose, avec des réponses de 2 à 4 phrases qui intègrent naturellement les données locales sans répéter les chiffres déjà cités : 1) les délais d'un projet de construction (permis de construire, chantier fixé au CCMI), 2) les étapes du projet, 3) le financement et le prêt à taux zéro (éligibilité selon revenus et zone, sans montant inventé), 4) comment bien choisir son terrain à [commune], 5) le rôle du courtier par rapport au constructeur. Questions formulées avec le nom de la commune quand c'est naturel.

- "metaTitle" : balise title de 50 à 60 caractères, espaces compris. Elle contient la requête locale "Faire construire à [commune]" puis un élément différenciant propre à la commune ou à Cimco (département, projet disponible, cadre de vie...). Pas de formule passe-partout identique d'une commune à l'autre.
- "metaDescription" : 140 à 155 caractères, espaces compris. Incitative au clic, elle intègre un repère local concret tiré des données (prix moyen, projet Cimco ou bassin de vie) et se termine par un appel à l'action. Rédaction unique pour cette commune.
- Si "metas_autres_communes" est fourni, ne reprends ni leur structure ni leurs tournures : ta formulation doit s'en distinguer nettement.

Réponds uniquement avec un objet JSON : {"metaTitle": string, "metaDescription": string, "intro": string, "local": string, "budget": string, "faq": [{"q": string, "a": string}, ...5 éléments]}.`

const cleanFaq = (faq) =>
  Array.isArray(faq)
    ? faq
        .filter((f) => f && typeof f.q === 'string' && typeof f.a === 'string' && f.q.trim() && f.a.trim())
        .slice(0, 5)
        .map((f) => ({ q: short(f.q, 200), a: short(f.a, 900) }))
    : []

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
    autres_annonces_cimco: Array.isArray(b.commune?.neighbors) ? b.commune.neighbors.slice(0, 8).map((x) => short(x, 60)) : [],
    dvf: capJson(b.dvf, 3000),
  }
  if (!data.commune) return res.status(400).json({ error: 'commune_manquante' })

  // Métas déjà produites pour d'autres communes : transmises pour que Claude s'en démarque
  const otherMetas = Array.isArray(b.otherMetas)
    ? b.otherMetas.slice(0, 6).map((m) => ({ titre: short(m?.metaTitle, 80), description: short(m?.metaDescription, 180) })).filter((m) => m.titre || m.description)
    : []
  if (otherMetas.length) data.metas_autres_communes = otherMetas

  const instructions = short(b.instructions, 1500)
  const current = b.current
    ? JSON.stringify({
        intro: short(b.current.intro, 1500),
        local: short(b.current.local, 1500),
        budget: short(b.current.budget, 1500),
        metaTitle: short(b.current.metaTitle, 80),
        metaDescription: short(b.current.metaDescription, 180),
        faq: cleanFaq(b.current.faq).map((f) => ({ q: short(f.q, 150), a: short(f.a, 500) })),
      })
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
  const faq = cleanFaq(parsed.faq)
  return res.status(200).json({
    page: {
      intro: short(parsed.intro, 2000),
      local: short(parsed.local, 2000),
      budget: short(parsed.budget, 2000),
      ...(faq.length >= 3 ? { faq } : {}),
      ...(typeof parsed.metaTitle === 'string' && parsed.metaTitle.trim() ? { metaTitle: short(parsed.metaTitle.trim(), 80) } : {}),
      ...(typeof parsed.metaDescription === 'string' && parsed.metaDescription.trim() ? { metaDescription: short(parsed.metaDescription.trim(), 200) } : {}),
    },
  })
}
