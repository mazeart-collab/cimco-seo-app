import { useEffect, useMemo, useState } from 'react'
import { Wand2, Copy, Check, Loader2, Users, Database, Home, AlertTriangle, Info, ImageOff, Download } from 'lucide-react'
import PreviewPane from './PreviewPane'
import { fmtEur, fmtNum } from '../lib/data'
import { fetchDvf, generate, cachedDvf, fetchPhotos, cachedPhotos } from '../lib/api'
import { optimizeImage, download, seoFileName, formatKo } from '../lib/optimize'
import { jaccard, creditOf, sectionsText, pageToHtml } from '../lib/page'

const THRESHOLD = 0.4

export default function Editor({ commune: c, all, sectionsFor, hasOverride, neighbors, onSelect, onSavePage, onStatus, onDvf, selectedPhoto, onPhoto, simulated, canSimulate, onSimulate, pageKey }) {
  const code = c.insee || c.info?.code
  const [dvf, setDvf] = useState(() => (code ? cachedDvf(code) : null))
  const [dvfState, setDvfState] = useState(dvf ? 'ok' : code ? 'loading' : 'nocode')
  const [instructions, setInstructions] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const [copied, setCopied] = useState(null)

  const sections = sectionsFor(c)

  const [opt, setOpt] = useState({ state: 'idle' })
  const optimize = async () => {
    setOpt({ state: 'busy' })
    try {
      const r = await optimizeImage(selectedPhoto.url)
      download(r.blob, seoFileName(c.name, c.dep))
      setOpt({ state: 'done', size: r.blob.size, original: r.originalSize, width: r.width, quality: r.quality, underLimit: r.underLimit })
    } catch {
      setOpt({ state: 'error' })
    }
  }
  useEffect(() => setOpt({ state: 'idle' }), [selectedPhoto?.url])
  const [manualUrl, setManualUrl] = useState('')
  const [manualError, setManualError] = useState(false)
  const [creditInput, setCreditInput] = useState(() => (selectedPhoto ? creditOf(selectedPhoto) : ''))
  useEffect(() => setCreditInput(selectedPhoto ? creditOf(selectedPhoto) : ''), [selectedPhoto?.url])
  const applyManual = () => {
    // Sans URL : met seulement à jour le crédit de la photo déjà choisie
    if (!manualUrl.trim() && selectedPhoto) {
      setManualError(false)
      return onPhoto(c.name, { ...selectedPhoto, creditText: creditInput.trim() })
    }
    let u
    try {
      u = new URL(manualUrl.trim())
    } catch {
      u = null
    }
    if (!u || !['http:', 'https:'].includes(u.protocol)) return setManualError(true)
    setManualError(false)
    onPhoto(c.name, { url: u.href, legend: `Vue de ${c.name}`, manual: true, creditText: creditInput.trim() })
    setManualUrl('')
  }

  const [photos, setPhotos] = useState(() => cachedPhotos(c.name))
  const [photoState, setPhotoState] = useState(photos ? 'ok' : 'loading')
  useEffect(() => {
    if (photos) return
    let alive = true
    fetchPhotos(c)
      .then((p) => {
        if (!alive) return
        setPhotos(p)
        setPhotoState('ok')
      })
      .catch(() => alive && setPhotoState('error'))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    const text = sectionsText(sections)
    const others = all.filter((x) => x.status === 'traitee' && x.name !== c.name)
    let best = { score: 0, name: null }
    for (const o of others) {
      const s = jaccard(text, sectionsText(sectionsFor(o)))
      if (s > best.score) best = { score: s, name: o.name }
    }
    return { ...best, compared: others.length }
  }, [sections, all, c.name, sectionsFor])

  const payload = () => ({
    commune: { name: c.name, cp: c.cp, depName: c.depName, population: c.population, annonce: c.annonce, neighbors: neighbors.map((n) => n.name) },
    dvf: dvf ? { source: dvf.source, terrain: dvf.terrain, maison: dvf.maison, repere: dvf.repere } : null,
    instructions,
    current: hasOverride ? { intro: sections.intro, local: sections.local, budget: sections.budget, faq: sections.faq } : null,
  })

  const run = async () => {
    setBusy(true)
    setNotice(null)
    const r = await generate(payload())
    if (r.page) {
      onSavePage(pageKey, r.page)
      onStatus(c.name, 'traitee')
      setNotice({ type: 'ok', text: 'Page générée et enregistrée.' })
    } else if (r.error) {
      setNotice({ type: 'warn', text: r.error })
    } else {
      onStatus(c.name, 'traitee')
      setNotice({
        type: 'info',
        text: `Mode de secours : ${
          r.reason === 'no_key'
            ? 'aucune clé ANTHROPIC_API_KEY détectée sur le serveur. Si elle vient d\'être ajoutée sur Vercel, redéployez le projet.'
            : r.reason === 'unavailable'
              ? "la fonction /api/generate est injoignable (normal en local, vérifiez le déploiement Vercel)."
              : `l'appel à l'IA a échoué (${r.reason}${r.detail ? ' : ' + String(r.detail).slice(0, 300) : ''}).`
        } La page affichée est construite à partir des données réelles, vos consignes n'ont pas été appliquées.`,
      })
    }
    setBusy(false)
  }

  const copy = async (mode) => {
    const html = pageToHtml(sections, mode)
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
    setCopied(mode)
    setTimeout(() => setCopied(null), 2000)
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
                {dvfState === 'ok' &&
                  [['terrain', 'Terrains à bâtir'], ['maison', 'Maisons, terrain inclus, par m² habitable']].map(
                    ([k, label]) =>
                      dvf?.[k] && (
                        <div key={k} className="mb-1">
                          <dd className="font-medium">
                            {fmtEur(dvf[k].prix_m2_moyen)} / m² <span className="text-xs font-normal text-slate-500">({label})</span>
                          </dd>
                          <dd className="text-xs text-slate-400">
                            {dvf[k].nb_transactions} vente{dvf[k].nb_transactions > 1 ? 's' : ''}, {dvf[k].periode}
                          </dd>
                        </div>
                      ),
                  )}
                {dvfState === 'ok' && dvf?.repere && (
                  <div className="mb-1">
                    <dd className="font-medium">
                      {fmtEur(dvf.repere.prix_m2_moyen)} / m² <span className="text-xs font-normal text-slate-500">(repère de secours, pas une moyenne de terrains)</span>
                    </dd>
                    <dd className="text-xs text-slate-400">
                      {dvf.repere.source}, {dvf.repere.periode}, {dvf.repere.type_bien || 'type de bien non précisé'}
                    </dd>
                  </div>
                )}
                {dvfState === 'ok' && dvf && <dd className="text-xs text-slate-400">Source : {dvf.source}</dd>}
                {dvfState === 'ok' && !dvf?.terrain && !dvf?.maison && !dvf?.repere && <dd className="font-medium text-slate-500">Pas de moyenne exploitable</dd>}
                {dvfState === 'error' && <dd className="font-medium text-amber-700">Données DVF momentanément indisponibles</dd>}
                {dvfState === 'nocode' && <dd className="font-medium text-slate-500">Code INSEE non disponible</dd>}
              </div>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Home size={16} className="mt-0.5 shrink-0 text-slate-400" />
              <div>
                <dt className="text-xs text-slate-500">Annonce Cimco</dt>
                <dd className="font-medium">
                  {c.annonce ? (
                    <>
                      {c.annonce.ref} : maison {c.annonce.maison_m2} m²
                      {c.annonce.terrain_m2 ? `, terrain ${c.annonce.terrain_m2} m²` : ''}, {fmtEur(c.annonce.budget)}
                    </>
                  ) : (
                    'Aucune annonce publiée'
                  )}
                </dd>
              </div>
            </div>
          </dl>
        </section>

        {canSimulate && (
        <label className="flex cursor-pointer items-center gap-2 px-1 text-xs text-slate-500">
          <input type="checkbox" checked={simulated} onChange={(e) => onSimulate(e.target.checked)} className="h-3.5 w-3.5 accent-[#4a6a78]" />
          Simuler 0 annonce locale (bien vendu)
        </label>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold">Illustration de la commune</h3>
          <p className="text-xs text-slate-500">Photos libres de Wikipédia et Wikimedia Commons. Cliquez sur une image pour l'inclure dans la page.</p>
          {photoState === 'loading' && (
            <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <Loader2 size={14} className="animate-spin" /> Recherche de photos
            </p>
          )}
          {photoState === 'error' && <p className="mt-3 text-xs text-amber-700">Wikimedia est momentanément injoignable. Réessayez plus tard.</p>}
          {photoState === 'ok' && photos?.length === 0 && (
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">Aucune photo pertinente trouvée pour {c.name}. La page reste sans illustration.</p>
          )}
          {photoState === 'ok' && photos?.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {photos.map((p) => (
                <button
                  key={p.url}
                  onClick={() => onPhoto(c.name, p)}
                  title={p.legend}
                  className={`overflow-hidden rounded-lg border-2 ${selectedPhoto?.url === p.url ? 'border-indigo-600' : 'border-transparent hover:border-slate-300'}`}
                >
                  <img src={p.url} alt={p.legend} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <div className="mt-3">
            <label htmlFor="img-url" className="text-xs font-medium text-slate-600">
              Ou coller l'URL d'une image
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="img-url"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://…"
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
              />
              <button onClick={applyManual} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">
                Appliquer
              </button>
            </div>
            <label htmlFor="img-credit" className="mt-2 block text-xs font-medium text-slate-600">
              Crédit photo (optionnel)
            </label>
            <input
              id="img-credit"
              value={creditInput}
              onChange={(e) => setCreditInput(e.target.value)}
              placeholder="Photo : Jean Dupont"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
            />
            {manualError && <p className="mt-1 text-xs text-rose-600">URL invalide : elle doit commencer par http:// ou https://.</p>}
            <p className="mt-1 text-xs text-slate-400">Vérifiez vous-même les droits d'utilisation de l'image. Sans crédit, aucun badge ? n'est affiché. Avec une photo déjà choisie, « Appliquer » sans URL met à jour son crédit.</p>
          </div>
          {selectedPhoto && (
            <div className="mt-3">
              <button
                onClick={optimize}
                disabled={opt.state === 'busy'}
                className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {opt.state === 'busy' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Télécharger optimisée (WebP SEO)
              </button>
              {opt.state === 'done' && (
                <p className="mt-1.5 text-xs text-emerald-700">
                  Prêt : {formatKo(opt.size)} en WebP ({opt.width} px de large, qualité {opt.quality}, original : {formatKo(opt.original)}).{!opt.underLimit && ' Attention : dépasse encore 100 Ko.'} Fichier : {seoFileName(c.name, c.dep)}
                </p>
              )}
              {opt.state === 'error' && <p className="mt-1.5 text-xs text-amber-700">Impossible d'optimiser cette image (source inaccessible ou format non pris en charge).</p>}
            </div>
          )}
          {selectedPhoto && (
            <button onClick={() => onPhoto(c.name, null)} className="mt-3 flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
              <ImageOff size={14} /> Aucune image
            </button>
          )}
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
          <p className="mt-2 text-xs text-slate-600">
            {similarity.compared
              ? `${pct} % de mots en commun avec ${similarity.name} (calculé via l'indice de Jaccard)`
              : 'Aucune autre page traitée à comparer.'}
          </p>
          {similarity.compared > 0 && (
            <p className="mt-1 text-xs text-slate-400">
              Indice de Jaccard : mots en commun divisés par l'ensemble des mots des deux pages, comptés par suites de 3 mots. Comparaison avec {similarity.compared} page{similarity.compared > 1 ? 's' : ''} traitée{similarity.compared > 1 ? 's' : ''}, seuil d'alerte 40 %.
            </p>
          )}
          {risky && (
            <p className="mt-2 flex gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" /> Similarité supérieure à 40 % avec {similarity.name} : risque de contenu dupliqué. Ajoutez des données propres à la commune ou reformulez.
            </p>
          )}
        </section>

        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ['raw', 'Copier HTML brut (HubSpot Rich Text)', 'Sans CSS, hérite du thème de cimco.fr'],
            ['standalone', 'Copier HTML autonome (avec CSS)', 'Bloc <style> isolé, pour un module HTML personnalisé'],
          ].map(([mode, label, hint]) => (
            <button
              key={mode}
              onClick={() => copy(mode)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm hover:bg-slate-50"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                {copied === mode ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                {copied === mode ? 'HTML copié' : label}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Colonne droite */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <PreviewPane name={c.name} s={sections} />
      </div>
    </div>
  )
}
