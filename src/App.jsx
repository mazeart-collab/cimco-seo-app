import { useCallback, useEffect, useMemo, useState } from 'react'
import { ListOrdered, PenSquare } from 'lucide-react'
import { buildCommunes, SEED_TREATED, seoBreakdown, seoLevel } from './lib/data'
import { enrich, loadGeoCache } from './lib/geo'
import { cachedDvf } from './lib/api'
import { buildTemplatePage, buildSections } from './lib/page'
import Banner from './components/Banner'
import Queue from './components/Queue'
import Editor from './components/Editor'

const STATUS_KEY = 'cimco.status.v1'
const PAGES_KEY = 'cimco.pages.v1'
const IMAGES_KEY = 'cimco.images.v1'
const SIM_KEY = 'cimco.sim0.v1'

const load = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}
const save = (key, v) => {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    /* stockage indisponible */
  }
}

export default function App() {
  const communes = useMemo(buildCommunes, [])
  const [tab, setTab] = useState('queue')
  const [selected, setSelected] = useState(null)
  const [geo, setGeo] = useState(loadGeoCache)
  const [geoState, setGeoState] = useState('loading') // loading | ok | partial
  const [status, setStatus] = useState(() => {
    const s = load(STATUS_KEY, null)
    if (s) return s
    const init = Object.fromEntries(communes.map((c) => [c.name, SEED_TREATED.includes(c.name) ? 'traitee' : 'a_creer']))
    save(STATUS_KEY, init)
    return init
  })
  const [pages, setPages] = useState(() => load(PAGES_KEY, {}))
  const [sim0, setSim0] = useState(() => load(SIM_KEY, {}))
  const [images, setImages] = useState(() => load(IMAGES_KEY, {}))
  const [dvfTick, setDvfTick] = useState(0)

  useEffect(() => {
    let alive = true
    enrich(communes, (c) => alive && setGeo(c)).then(({ failed }) => alive && setGeoState(failed ? 'partial' : 'ok'))
    return () => {
      alive = false
    }
  }, [communes])

  const setCommuneStatus = useCallback((name, value) => {
    setStatus((prev) => {
      const next = { ...prev, [name]: value }
      save(STATUS_KEY, next)
      return next
    })
  }, [])

  const savePage = useCallback((name, page) => {
    setPages((prev) => {
      const next = { ...prev, [name]: page }
      save(PAGES_KEY, next)
      return next
    })
  }, [])

  const setSimulated = useCallback((name, on) => {
    setSim0((prev) => {
      const next = { ...prev }
      if (on) next[name] = true
      else delete next[name]
      save(SIM_KEY, next)
      return next
    })
  }, [])

  // Mode "0 annonce locale" : simulé, ou réel si la commune n'a plus d'annonce
  const eff = useCallback((c) => (sim0[c.name] && c.annonce ? { ...c, annonce: null, nbAnnonces: 0 } : c), [sim0])
  const pageKey = (c) => (c.nbAnnonces === 0 ? `${c.name}#sim0` : c.name)

  const selectImage = useCallback((name, photo) => {
    setImages((prev) => {
      const next = { ...prev }
      if (photo) next[name] = photo
      else delete next[name]
      save(IMAGES_KEY, next)
      return next
    })
  }, [])

  const ranked = useMemo(() => {
    const maxPop = Math.max(2, ...communes.map((c) => geo[c.name]?.population || 0))
    const maxAnn = Math.max(...communes.map((c) => c.nbAnnonces))
    return communes
      .map((c) => {
        const info = geo[c.name]
        const breakdown = seoBreakdown(c, info?.population, maxPop, maxAnn)
        return {
          ...c,
          info,
          population: info?.population ?? null,
          breakdown,
          score: breakdown.total,
          level: seoLevel(breakdown.total, info?.population),
          status: status[c.name] || 'a_creer',
        }
      })
      .sort((a, b) => b.score - a.score || b.nbAnnonces - a.nbAnnonces || (b.population || 0) - (a.population || 0) || (b.budgetMin || 0) - (a.budgetMin || 0))
  }, [communes, geo, status])

  // Annonces du même département, les plus proches par code postal en premier
  // Annonces voisines : même département d'abord ; sans annonce locale, complétées par la région si besoin
  const neighborsOf = useCallback(
    (c) => {
      const byProximity = (a, b) => Math.abs(a.cp - c.cp) - Math.abs(b.cp - c.cp) || a.name.localeCompare(b.name)
      const withListing = communes.filter((x) => x.annonce)
      const sameDep = withListing.filter((x) => x.dep === c.dep && x.name !== c.name).sort(byProximity)
      if (c.nbAnnonces > 0 || sameDep.length >= 3) return sameDep.slice(0, 3)
      // Sans annonce locale et moins de 3 annonces dans le département : complété par les plus proches de la région
      const others = withListing.filter((x) => x.dep !== c.dep).sort(byProximity)
      return [...sameDep, ...others].slice(0, 3)
    },
    [communes],
  )

  // Page effective : texte de secours (données réelles) surchargé par le texte généré ou modifié
  const pageFor = useCallback(
    (raw) => {
      const c = eff(raw)
      const info = geo[c.name]
      const code = c.insee || info?.code
      const dvf = code ? cachedDvf(code) : null
      return { ...buildTemplatePage(c, info, dvf, neighborsOf(c)), ...(pages[pageKey(c)] || {}) }
    },
    // dvfTick force le recalcul quand un nouveau résultat DVF est mis en cache
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [geo, pages, neighborsOf, dvfTick, eff],
  )

  // Page complète (sections) : source unique pour l'aperçu, l'export HTML et la similarité
  const sectionsFor = useCallback(
    (raw) => {
      const c = eff(raw)
      const info = geo[c.name]
      const code = c.insee || info?.code
      const dvf = code ? cachedDvf(code) : null
      return buildSections(c, pageFor(c), dvf, neighborsOf(c), images[c.name] || null)
    },
    [geo, pageFor, neighborsOf, images, eff],
  )

  const nextCommune = ranked.find((c) => c.status === 'a_creer')
  const open = (name) => {
    setSelected(name)
    setTab('editor')
  }
  const current = ranked.find((c) => c.name === (selected || nextCommune?.name)) || ranked[0]

  return (
    <div className="min-h-screen">
      <header className="border-b border-[#1a1a1812] bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <img src="/cimco-logo.webp" alt="Cimco" width="30" height="34" className="h-9 w-auto" />
            <div>
              <h1 className="text-base font-semibold leading-tight">Cimco SEO Local</h1>
              <p className="text-xs text-slate-500">Pages « Faire construire à [commune] »</p>
            </div>
          </div>
          <nav className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {[
              ['queue', 'File de priorité', ListOrdered],
              ['editor', 'Éditeur de page', PenSquare],
            ].map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5">
        <Banner next={nextCommune} geoState={geoState} onCreate={() => nextCommune && open(nextCommune.name)} />
        {tab === 'queue' ? (
          <Queue rows={ranked} geoState={geoState} onOpen={open} />
        ) : (
          current && (
            <Editor
              key={current.name}
              commune={eff(current)}
              canSimulate={!!current.annonce}
              simulated={!!sim0[current.name]}
              onSimulate={(on) => setSimulated(current.name, on)}
              pageKey={pageKey(eff(current))}
              all={ranked}
              sectionsFor={sectionsFor}
              selectedPhoto={images[current.name] || null}
              onPhoto={selectImage}
              hasOverride={!!pages[pageKey(eff(current))]}
              neighbors={neighborsOf(eff(current))}
              onSelect={setSelected}
              onSavePage={savePage}
              onStatus={setCommuneStatus}
              onDvf={() => setDvfTick((t) => t + 1)}
            />
          )
        )}
      </main>
    </div>
  )
}
