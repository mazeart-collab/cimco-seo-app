// Fonction serveur : les clés GEMINI_API_KEY / ANTHROPIC_API_KEY restent côté serveur, jamais dans le code client.
// Ordre : Gemini si GEMINI_API_KEY, sinon Anthropic si ANTHROPIC_API_KEY, sinon le client bascule sur le template.
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
- Si annonce_cimco est null, il n'y a pas d'annonce publiée dans la commune : le dire positivement, indiquer que Cimco accompagne les recherches de terrain sur le secteur, et citer les annonces voisines fournies.
- Ne cite jamais les codes de référence internes des annonces dans le texte rédigé.
- Français naturel, sans tirets cadratins.
- Le texte doit être propre à la commune : appuie-toi sur ses données (annonce, population, prix moyen, annonces voisines du département).
Réponds uniquement avec un objet JSON : {"intro": string, "local": string, "budget": string} (chaque valeur : un paragraphe de 2 à 4 phrases).`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const geminiKey = process.env.GEMINI_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!geminiKey && !anthropicKey) return res.status(503).json({ error: 'no_key' })

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
    annonce_cimco: b.commune?.annonce ? Object.fromEntries(Object.entries(b.commune.annonce).filter(([k]) => k !== 'ref')) : null,
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

  // gemini-2.5-flash en premier ; si le modèle est introuvable (404), on essaie l'alias et les suivants
  const geminiModels = [...new Set([process.env.GEMINI_MODEL, 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash'].filter(Boolean))]
  const viaGemini = async () => {
    let last = 'gemini_error'
    for (const model of geminiModels) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 4000 },
        }),
        signal: AbortSignal.timeout(55000),
      })
      if (r.status === 404) {
        last = 'gemini_404'
        continue
      }
      if (!r.ok) throw new Error('gemini_' + r.status)
      const j = await r.json()
      return (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('')
    }
    // Aucun nom connu ne passe : on demande à Google la liste des modèles disponibles pour cette clé
    try {
      const lr = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}&pageSize=100`, { signal: AbortSignal.timeout(15000) })
      if (lr.ok) {
        const list = ((await lr.json()).models || [])
          .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
          .map((m) => String(m.name).replace(/^models\//, ''))
          .filter((n) => /flash/.test(n) && !/(image|tts|live|audio|thinking|lite)/.test(n) && !geminiModels.includes(n))
        for (const model of list.slice(0, 3)) {
          const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: SYSTEM }] },
              contents: [{ role: 'user', parts: [{ text: user }] }],
              generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 4000 },
            }),
            signal: AbortSignal.timeout(55000),
          })
          if (!r.ok) continue
          const j = await r.json()
          return (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('')
        }
        last = list.length ? 'gemini_404_aucun_modele_utilisable' : 'gemini_404_aucun_modele_flash'
      } else {
        last = 'gemini_404_liste_' + lr.status
      }
    } catch {
      /* on garde last */
    }
    throw new Error(last)
  }

  const viaAnthropic = async () => {
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
        max_tokens: 4000,
        fallbacks: 'default',
        output_config: { effort: 'low' },
        system: SYSTEM,
        messages: [{ role: 'user', content: user }],
      }),
      signal: AbortSignal.timeout(55000),
    })
    if (!r.ok) throw new Error('upstream_' + r.status)
    const msg = await r.json()
    if (msg.stop_reason === 'refusal') throw new Error('refusal')
    return (msg.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('')
  }

  const providers = [geminiKey && viaGemini, anthropicKey && viaAnthropic].filter(Boolean)
  let lastError = 'generation_failed'
  for (const run of providers) {
    try {
      const text = await run()
      const match = text.match(/\{[\s\S]*\}/)
      const parsed = match ? JSON.parse(match[0]) : null
      if (!parsed?.intro || !parsed?.local || !parsed?.budget) {
        lastError = 'bad_output'
        continue
      }
      return res.status(200).json({
        page: { intro: short(parsed.intro, 2000), local: short(parsed.local, 2000), budget: short(parsed.budget, 2000) },
      })
    } catch (e) {
      lastError = String(e.message || 'generation_failed').slice(0, 40)
    }
  }
  return res.status(502).json({ error: lastError })
}
