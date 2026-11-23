import { useEffect, useMemo, useState } from 'react'
import { Wand2, Copy, Check, Loader2, Users, Database, Home, AlertTriangle, Info } from 'lucide-react'
import Preview from './Preview'
import { fmtEur, fmtNum } from '../lib/data'
import { fetchDvf, generate, cachedDvf } from '../lib/api'
import { jaccard, pageText, pageToHtml } from '../lib/page'

const THRESHOLD = 0.4

export default function Editor({ commune: c, all, pageFor, page, hasOverride, neighbors, onSelect, onSavePage, onStatus, onDvf }) {
  const code = c.info?.code
  const [dvf, setDvf] = useState(() => (code ? cachedDvf(code) : null))
  const [dvfState, setDvfState] = useState(dvf ? 'ok' : code ? 'loading' : 'nocode')
  const [instructions, setInstructions] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!code || dvf) return
    let alive = true
    fetchDvf(code)
      .then((d) => {
        if (!alive) return
        setDvf(d)
        setDvfState('ok')
        onDvf()
      })
      .catch(() => alive && setDvfState('error'))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  // Similarité de Jaccard avec les autres pages traitées
  const similarity = useMemo(() => {
    const text = pageText(page)
    const others = all.filter((x) => x.status === 'traitee' && x.name !== c.name)
    let best = { score: 0, name: null }
    for (const o of others) {
      const s = jaccard(text, pageText(pageFor(o)))
      if (s > best.score) best = { score: s, name: o.name }
    }
    return { ...best, compared: others.length }
  }, [page, all, c.name, pageFor])

  const payload = () => ({
    commune: { name: c.name, cp: c.cp, depName: c.depName, population: c.population, annonce: c.annonce, neighbors },
    dvf: dvf ? { source: dvf.source, periode: dvf.periode, terrain: dvf.terrain, maison: dvf.maison } : null,
    instructions,
    current: hasOverride ? { intro: page.intro, local: page.local, budget: page.budget } : null,
  })

  const run = async () => {
    setBusy(true)
    setNotice(null)
    const r = await generate(payload())
    if (r.page) {
      onSavePage(c.name, { ...page, ...r.page })
      onStatus(c.name, 'traitee')
      setNotice({ type: 'ok', text: 'Page générée et enregistrée.' })
    } else if (r.error) {
      setNotice({ type: 'warn', text: r.error })
    } else {
      onStatus(c.name, 'traitee')
      setNotice({
        type: 'info',
        text: "Mode de secours : la génération IA n'est pas disponible (clé API non configurée sur le serveur). La page affichée est construite à partir des données réelles, vos consignes n'ont pas été appliquées.",
      })
    }
    setBusy(false)
  }

  const copy = async () => {
    const html = pageToHtml(c, page, dvf)
    try {
      await navigator.clipboard.writeText(html)
    } catch {
      const t = document.createElement('textarea')
      t.value = html
      document.body.appendChild(t)
      t.select()
      document.execCommand('copy')
      t.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const pct = Math.round(similarity.score * 100)
  const risky = similarity.score > THRESHOLD

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Colonne gauche */}
      <div className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <select
              value={c.name}
              onChange={(e) => onSelect(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold"
            >
              {all.map((x) => (
                <option key={x.name} value={x.name}>
                  {x.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => onStatus(c.name, c.status === 'traitee' ? 'a_creer' : 'traitee')}
              className={`rounded-full px-3 py-1 text-xs font-medium ${c.status === 'traitee' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
            >
              {c.status === 'traitee' ? 'Traitée' : 'À créer'} (changer)
            </button>
          </div>

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex gap-2">
              <Users size={16} className="mt-0.5 shrink-0 text-slate-400" />
              <div>
                <dt className="text-xs text-slate-500">Population</dt>
                <dd className="font-medium">{c.population ? fmtNum(c.population) + ' hab.' : 'Indisponible'}</dd>
                <dd className="text-xs text-slate-400">Source : geo.api.gouv.fr</dd>
              </div>
            </div>
            <div className="flex gap-2">
              <Database size={16} className="mt-0.5 shrink-0 text-slate-400" />
              <div>
                <dt className="text-xs text-slate-500">Prix moyen terrains (DVF)</dt>
                {dvfState === 'loading' && (
                  <dd className="flex items-center gap-1 font-medium text-slate-500">
                    <Loader2 size={14} className="animate-spin" /> Chargement
                  </dd>
                )}
                {dvfState === 'ok' && dvf?.terrain && (
                  <>
                    <dd className="font-medium">{fmtEur(dvf.terrain.prix_m2_moyen)} / m²</dd>
                    <dd className="text-xs text-slate-400">
                      {dvf.terrain.nb_transactions} ventes, {dvf.periode}. Source : {dvf.source}
                    </dd>
                  </>
                )}
                {dvfState === 'ok' && !dvf?.terrain && <dd className="font-medium text-slate-500">Pas de moyenne exploitable</dd>}
                {dvfState === 'error' && <dd className="font-medium text-amber-700">Données DVF momentanément indisponibles</dd>}
                {dvfState === 'nocode' && <dd className="font-medium text-slate-500">Code INSEE non disponible</dd>}
              </div>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Home size={16} className="mt-0.5 shrink-0 text-slate-400" />
              <div>
                <dt className="text-xs text-slate-500">Annonce Cimco</dt>
                <dd className="font-medium">
                  {c.annonce.ref} : maison {c.annonce.maison_m2} m²
                  {c.annonce.terrain_m2 ? `, terrain ${c.annonce.terrain_m2} m²` : ''}, {fmtEur(c.annonce.budget)}
                </dd>
              </div>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label htmlFor="consignes" className="text-sm font-semibold">
            Consignes à l'IA
          </label>
          <textarea
            id="consignes"
            rows={4}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Ex. : ton plus chaleureux, insister sur la proximité des services, intro plus courte…"
            className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <button
            onClick={run}
            disabled={busy}
            className="mt-3 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            Générer / Modifier
          </button>
          {notice && (
            <p
              className={`mt-3 flex gap-2 rounded-lg p-3 text-xs ${
                notice.type === 'ok' ? 'bg-emerald-50 text-emerald-800' : notice.type === 'warn' ? 'bg-amber-50 text-amber-800' : 'bg-sky-50 text-sky-800'
              }`}
            >
              <Info size={14} className="mt-0.5 shrink-0" /> {notice.text}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Similarité (indice de Jaccard)</h3>
            <span className={`text-sm font-semibold tabular-nums ${risky ? 'text-red-600' : 'text-emerald-600'}`}>{similarity.compared ? pct + ' %' : 'n.d.'}</span>
          </div>
          <div className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${risky ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: Math.min(100, pct) + '%' }} />
            <div className="absolute inset-y-0 w-px bg-slate-400" style={{ left: THRESHOLD * 100 + '%' }} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {similarity.compared
              ? `Comparaison avec ${similarity.compared} page${similarity.compared > 1 ? 's' : ''} traitée${similarity.compared > 1 ? 's' : ''}. Plus proche : ${similarity.name} (seuil d'alerte : 40 %).`
              : "Aucune autre page traitée à comparer."}
          </p>
          {risky && (
            <p className="mt-2 flex gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" /> Similarité supérieure à 40 % avec {similarity.name} : risque de contenu dupliqué. Ajoutez des données propres à la commune ou reformulez.
            </p>
          )}
        </section>

        <button
          onClick={copy}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold shadow-sm hover:bg-slate-50"
        >
          {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
          {copied ? 'HTML copié' : 'Copier le HTML pour HubSpot'}
        </button>
      </div>

      {/* Colonne droite */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Aperçu de la page</p>
        <Preview commune={c} page={page} dvf={dvf} />
      </div>
    </div>
  )
}
