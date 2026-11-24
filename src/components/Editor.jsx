import { useEffect, useMemo, useState } from 'react'
import { Image as ImageIcon, Zap, ArrowLeftRight, Wand2, Copy, Check, Loader2, Database, Home, AlertTriangle, Info, ImageOff, Download, MapPin, Landmark, CheckCircle2, ChevronDown, SlidersHorizontal, ShieldCheck, Eye, Code2, Tags } from 'lucide-react'
import { BTN_PRIMARY, BTN_SECONDARY } from './Steps'
import PreviewPane from './PreviewPane'
import SeoMeta from './SeoMeta'
import { fmtEur, fmtNum } from '../lib/data'
import { fetchDvf, generate, cachedDvf, fetchPhotos, cachedPhotos } from '../lib/api'
import { optimizeImage, download, seoFileName, formatKo } from '../lib/optimize'
import { jaccard, creditOf, sectionsText, pageToHtml, metaText } from '../lib/page'

const THRESHOLD = 0.4
// Titre + description : seuil plus haut, les textes sont courts et partagent la requête « Faire construire à »
const META_THRESHOLD = 0.5

export default function Editor({ commune: c, all, sectionsFor, hasOverride, neighbors, onSelect, onSavePage, onStatus, onDvf, selectedPhoto, onPhoto, simulated, canSimulate, onSimulate, pageKey, onChange }) {
  const code = c.insee || c.info?.code
  const [dvf, setDvf] = useState(() => (code ? cachedDvf(code) : null))
  const [dvfState, setDvfState] = useState(dvf ? 'ok' : code ? 'loading' : 'nocode')
  const [instructions, setInstructions] = useState('')
  const [busy, setBusy] = useState(false) // false | 'custom' | 'quick'
  const [notice, setNotice] = useState(null)
  const [copied, setCopied] = useState(null)
  const [view, setView] = useState('preview') // preview | code

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

  // Unicité des métadonnées par rapport aux autres pages traitées (nom de commune masqué)
  const others = useMemo(() => all.filter((x) => x.status === 'traitee' && x.name !== c.name), [all, c.name])
  const metaSimilarity = useMemo(() => {
    const mine = metaText(sections, c)
    let best = { score: 0, name: null }
    for (const o of others) {
      const s = jaccard(mine, metaText(sectionsFor(o), o))
      if (s > best.score) best = { score: s, name: o.name }
    }
    return { ...best, compared: others.length }
  }, [sections, others, sectionsFor, c])

  // quick : génération rapide, consignes par défaut uniquement (ni consigne ni texte actuel envoyés)
  const payload = (quick) => ({
    commune: { name: c.name, cp: c.cp, depName: c.depName, population: c.population, annonce: c.annonce, neighbors: neighbors.map((n) => `${n.name} (${n.depName})`) },
    dvf: dvf ? { source: dvf.source, terrain: dvf.terrain, maison: dvf.maison, repere: dvf.repere } : null,
    instructions: quick ? '' : instructions,
    otherMetas: others.slice(0, 6).map((o) => {
      const s = sectionsFor(o)
      return { metaTitle: s.metaTitle, metaDescription: s.metaDescription }
    }),
    current: !quick && hasOverride ? { intro: sections.intro, local: sections.local, budget: sections.budget, faq: sections.faq, metaTitle: sections.metaTitle, metaDescription: sections.metaDescription } : null,
  })

  // quick : génération rapide sans consigne (rédaction neuve) ; sinon les consignes ajustent la page actuelle
  const run = async (quick) => {
    setBusy(quick ? 'quick' : 'custom')
    setNotice(null)
    const r = await generate(payload(quick))
    if (r.page) {
      // Garde la commune affichée : sinon l'éditeur passe à la commune recommandée suivante
      onSelect(c.name)
      onSavePage(pageKey, r.page)
      onStatus(c.name, 'traitee')
      setNotice({ type: 'ok', text: 'Page générée et enregistrée.' })
    } else if (r.error) {
      setNotice({ type: 'warn', text: r.error })
    } else {
      onSelect(c.name)
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
    const html = mode === 'meta' ? `Meta Title : ${sections.metaTitle}\nMeta Description : ${sections.metaDescription}` : pageToHtml(sections, mode)
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
  const price = dvf?.terrain
    ? { v: `${fmtEur(dvf.terrain.prix_m2_moyen)} / m²`, l: 'terrains à bâtir, moyenne DVF' }
    : dvf?.maison
      ? { v: `${fmtEur(dvf.maison.prix_m2_moyen)} / m²`, l: 'maisons, moyenne DVF' }
      : dvf?.repere
        ? { v: `${fmtEur(dvf.repere.prix_m2_moyen)} / m²`, l: `repère ${dvf.repere.source}` }
        : null
  const summary = [
    ['Commune', `${c.name} (${c.cp})`, MapPin],
    ['Département', `${c.depName} (${c.dep})`, Landmark],
    ['Annonces Cimco', c.nbAnnonces ? `${c.nbAnnonces} annonce${c.nbAnnonces > 1 ? 's' : ''}` : 'Aucune', Home],
    [
      'Prix moyen',
      dvfState === 'loading' ? 'Chargement…' : price ? price.v : dvfState === 'error' ? 'DVF indisponible' : 'Non disponible',
      Database,
      price?.l,
    ],
  ]
  const dataReady = dvfState !== 'loading'

  const CARD = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,38fr)_minmax(0,62fr)]">
      {/* Colonne de gauche : panneau de contrôle */}
      <aside data-tour="control" className="space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-1">
        <section data-tour="summary" className={CARD}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Commune sélectionnée</p>
              <h2 className="truncate text-lg font-semibold">{c.name}</h2>
            </div>
            <button onClick={onChange} className={`shrink-0 ${BTN_SECONDARY} px-2.5 py-1.5 text-xs`}>
              <ArrowLeftRight size={14} /> Changer
            </button>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3">
            {summary.map(([k, v, Icon, sub]) => (
              <div key={k} className="min-w-0">
                <dt className="flex items-center gap-1 text-xs text-slate-500">
                  <Icon size={12} /> {k}
                </dt>
                <dd className="text-sm font-semibold">{v}</dd>
                {sub && <dd className="text-[11px] text-slate-400">{sub}</dd>}
              </div>
            ))}
          </dl>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-600">
              {dataReady ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Loader2 size={14} className="animate-spin text-slate-400" />}
              {dataReady ? 'Données prêtes' : 'Chargement des données'}
            </span>
            <button
              onClick={() => onStatus(c.name, c.status === 'traitee' ? 'a_creer' : 'traitee')}
              title="Changer le statut"
              className={`rounded-full px-2.5 py-0.5 font-medium ${c.status === 'traitee' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}
            >
              {c.status === 'traitee' ? 'Traitée' : 'À créer'}
            </button>
          </div>
        </section>

        <section data-tour="generation" className={CARD}>
          <button data-tour="generate" onClick={() => run(true)} disabled={!!busy} className={`w-full ${BTN_PRIMARY}`}>
            {busy === 'quick' ? <Loader2 size={17} className="animate-spin" /> : <Zap size={17} />}
            {busy === 'quick' ? 'Génération en cours…' : 'Générer la page SEO'}
          </button>
          <p className="mt-2 text-center text-xs text-slate-500">Génération rapide, sans consigne : Claude rédige à partir des données réelles.</p>
          {notice && (
            <p
              className={`mt-3 flex gap-2 rounded-lg p-3 text-xs ${
                notice.type === 'ok' ? 'bg-emerald-50 text-emerald-800' : notice.type === 'warn' ? 'bg-amber-50 text-amber-800' : 'bg-sky-50 text-sky-800'
              }`}
            >
              <Info size={14} className="mt-0.5 shrink-0" /> {notice.text}
            </p>
          )}

          <details data-tour="options" className="group mt-4 rounded-xl border border-slate-200">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-slate-700">
              <span className="flex items-center gap-2">
                <SlidersHorizontal size={15} className="text-slate-400" /> Options de personnalisation
              </span>
              <ChevronDown size={16} className="text-slate-400 transition group-open:rotate-180" />
            </summary>
            <div className="space-y-5 border-t border-slate-100 px-4 py-4">
              <div>
                <label htmlFor="consignes" className="text-sm font-semibold">
                  Consignes à l'IA
                </label>
                <textarea
                  id="consignes"
                  rows={3}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Ex. : ton plus chaleureux, insister sur la proximité des services, intro plus courte…"
                  className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                <button onClick={() => run(false)} disabled={!!busy || !instructions.trim()} className={`mt-2 ${BTN_SECONDARY}`}>
                  {busy === 'custom' ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
                  {busy === 'custom' ? 'Génération…' : 'Générer avec ces consignes'}
                </button>
              </div>
              {canSimulate && (
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-500">
                  <input type="checkbox" checked={simulated} onChange={(e) => onSimulate(e.target.checked)} className="h-3.5 w-3.5 accent-[#4a6a78]" />
                  Simuler 0 annonce locale (bien vendu)
                </label>
              )}
            </div>
          </details>
        </section>

        <section data-tour="photo" className={CARD}>
          <h3 className="text-sm font-semibold">Photo de la page</h3>
          <div className="mt-3 flex items-center gap-3">
            {selectedPhoto ? (
              <img src={selectedPhoto.url} alt={selectedPhoto.legend || `Vue de ${c.name}`} className="h-16 w-24 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" />
            ) : (
              <span className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                <ImageIcon size={20} />
              </span>
            )}
            <div className="min-w-0 text-xs">
              <p className="font-medium text-slate-700">{selectedPhoto ? 'Photo actuelle' : 'Aucune photo pour le moment'}</p>
              <p className="text-slate-500">{selectedPhoto ? creditOf(selectedPhoto) || 'Sans crédit affiché' : 'Choisissez une photo libre ci-dessous ou ajoutez la vôtre par URL.'}</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500">Photos libres de Wikipédia et Wikimedia Commons : cliquez pour choisir.</p>
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
                  <button onClick={applyManual} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
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
                    className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
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

        <section data-tour="export" className={CARD}>
          <h3 className="text-sm font-semibold">Export HubSpot</h3>
          <div className="mt-3 grid gap-2">
            <button onClick={() => copy('standalone')} className={BTN_SECONDARY}>
              {copied === 'standalone' ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
              {copied === 'standalone' ? 'HTML/CSS copié' : 'Copier le HTML/CSS'}
            </button>
            <button onClick={() => copy('meta')} className={BTN_SECONDARY}>
              {copied === 'meta' ? <Check size={15} className="text-emerald-600" /> : <Tags size={15} />}
              {copied === 'meta' ? 'Métadonnées copiées' : 'Copier Meta Title / Description'}
            </button>
            <button onClick={() => copy('raw')} className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline">
              {copied === 'raw' ? 'HTML brut copié' : 'Copier le HTML brut (sans CSS, hérite du thème)'}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">Le HTML/CSS reprend les métadonnées en commentaire en tête du code.</p>
        </section>
      </aside>

      {/* Colonne de droite : résultat */}
      <div data-tour="result" className="min-w-0 space-y-4">
        <SeoMeta commune={c.name} title={sections.metaTitle} description={sections.metaDescription} similarity={metaSimilarity} threshold={META_THRESHOLD} />

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
          <span className="font-medium">Contenu de la page :</span>
          {similarity.compared ? (
            <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${risky ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {risky ? <AlertTriangle size={13} /> : <ShieldCheck size={13} />}
              {risky ? `Trop proche de ${similarity.name} (${pct} %)` : `Unique (${pct} %)`}
            </span>
          ) : (
            <span className="text-xs text-slate-500">aucune autre page à comparer</span>
          )}
          <span className="text-xs text-slate-400">
            Indice de Jaccard face à {similarity.compared} page{similarity.compared > 1 ? 's' : ''} traitée{similarity.compared > 1 ? 's' : ''}, seuil 40 %.
          </span>
        </div>

        <div data-tour="preview">
          <div role="tablist" className="mb-3 inline-flex gap-1 rounded-lg bg-slate-100 p-1">
            {[
              ['preview', 'Aperçu visuel', Eye],
              ['code', 'Code HTML', Code2],
            ].map(([id, label, Icon]) => (
              <button
                key={id}
                role="tab"
                aria-selected={view === id}
                onClick={() => setView(id)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${view === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
          {view === 'preview' ? (
            <PreviewPane name={c.name} s={sections} />
          ) : (
            <pre className="max-h-[720px] overflow-auto rounded-xl bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
              <code>{pageToHtml(sections, 'standalone')}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
