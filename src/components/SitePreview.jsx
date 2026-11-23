import { useEffect, useState } from 'react'
import { Phone, Menu, X } from 'lucide-react'
import Preview from './Preview'
import { DeviceSwitch } from './PreviewPane'

const SITE = 'https://www.cimco.fr'
const LINKS = [
  ['Accueil', '/'],
  ['Annonces', '/annonces-maisons-terrains/'],
  ['Qui sommes-nous\u00a0?', '/qui-sommes-nous/'],
  ['Avis Clients', '/avis-clients-cimco/'],
]
const abs = (path) => SITE + path

// En-tête reprenant la navigation de cimco.fr (liens réels vers le site)
function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 flex justify-center px-3 pt-3">
      <nav aria-label="Navigation principale" className="flex w-full max-w-[880px] items-center gap-3 rounded-full border border-white/60 bg-white/70 py-2 pl-3 pr-2 shadow-[0_16px_40px_#1a1a1817] backdrop-blur-xl">
        <a href={abs('/')} target="_blank" rel="noopener noreferrer" aria-label="CIMCO" className="shrink-0">
          <img src="/cimco-logo.webp" alt="CIMCO, courtier en construction" width="118" height="132" className="h-9 w-auto" />
        </a>
        <ul className="hidden flex-1 items-center justify-center gap-1 @min-[640px]:flex">
          {LINKS.map(([label, path]) => (
            <li key={path}>
              <a href={abs(path)} target="_blank" rel="noopener noreferrer" className="block rounded-full px-3.5 py-2 font-[family-name:var(--font-display)] text-sm font-semibold text-[#57534c] hover:text-[#1a1a18]">
                {label}
              </a>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-2 @min-[640px]:ml-0">
          <a href="tel:0472538146" aria-label="Contact téléphonique" className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-white/70 bg-white/60 text-[#1a1a18]">
            <Phone size={17} />
          </a>
          <details className="group relative @min-[640px]:hidden">
            <summary aria-label="Menu" className="flex h-[42px] w-[42px] cursor-pointer list-none items-center justify-center rounded-full border border-white/70 bg-white/60 text-[#1a1a18]">
              <Menu size={17} className="group-open:hidden" />
              <X size={17} className="hidden group-open:block" />
            </summary>
            <div className="absolute right-0 top-12 w-52 rounded-2xl border border-[#1a1a1812] bg-white p-2 text-sm shadow-lg">
              {[...LINKS, ['Contact', '/contact/']].map(([label, path]) => (
                <a key={path} href={abs(path)} target="_blank" rel="noopener noreferrer" className="block rounded-lg px-3 py-2 font-semibold text-[#57534c] hover:bg-[#f4f3ef]">
                  {label}
                </a>
              ))}
            </div>
          </details>
          <a href={abs('/#contact')} target="_blank" rel="noopener noreferrer" className="hidden whitespace-nowrap rounded-full bg-[#1a1a18] px-5 py-2.5 font-[family-name:var(--font-display)] text-sm font-bold text-[#fbfaf8] @min-[480px]:block">
            Estimer mon projet
          </a>
        </div>
      </nav>
    </header>
  )
}

function SiteFooter() {
  const cols = [
    ['Navigation', [['Accueil', '/'], ['Annonces Foncières', '/annonces-maisons-terrains/'], ['Nos Réalisations', '/realisations-maisons-individuelles/'], ['Qui sommes-nous\u00a0?', '/qui-sommes-nous/'], ['Avis Clients', '/avis-clients-cimco/']]],
    ['Informations', [['Contact', '/contact/'], ['Mentions légales', '/mentions-legales/'], ['Politique de confidentialité', '/politique-de-confidentialite/']]],
  ]
  return (
    <footer className="mt-12 bg-[#1a1a18] px-6 py-10 text-[#fbfaf8]">
      <div className="mx-auto grid max-w-5xl gap-8 @min-[640px]:grid-cols-4">
        <div>
          <img src="/cimco-logo.webp" alt="CIMCO" className="h-10 w-auto invert" />
          <p className="mt-3 text-sm text-[#cfe3ec]">Courtier en construction de maisons individuelles en Auvergne-Rhône-Alpes depuis 2009.</p>
        </div>
        {cols.map(([title, items]) => (
          <div key={title}>
            <h3 className="text-sm font-bold">{title}</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-[#cfe3ec]">
              {items.map(([label, path]) => (
                <li key={path}>
                  <a href={abs(path)} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h3 className="text-sm font-bold">Contact &amp; Bureaux</h3>
          <p className="mt-3 text-sm text-[#cfe3ec]">3 chemin des Plattes, 69390 Vourles</p>
          <p className="mt-1.5 text-sm">
            <a href="tel:0472538146" className="text-[#cfe3ec] hover:text-white">
              04 72 53 81 46
            </a>
          </p>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-5xl border-t border-white/10 pt-4 text-xs text-[#a9c6d2]">© 2026 CIMCO. Courtier en construction. Tous droits réservés.</p>
    </footer>
  )
}

// Page d'aperçu autonome (ouverte dans un nouvel onglet) : en-tête et pied de page de cimco.fr autour de la page générée
export default function SitePreview({ name, s, initialDevice = 'desktop' }) {
  const [device, setDevice] = useState(initialDevice === 'mobile' ? 'mobile' : 'desktop')

  useEffect(() => {
    document.title = `Aperçu : ${name}`
    const onKey = (e) => e.key === 'Escape' && window.close()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [name])

  const site = (
    <div className="@container min-h-screen bg-[#fbfaf8]">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-3 pb-4 pt-6 @min-[640px]:px-6">
        <Preview s={s} />
      </main>
      <SiteFooter />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-200">
      <div className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-slate-900 px-4 py-2 text-white">
        <p className="truncate text-xs font-medium">Aperçu de la page : {name}</p>
        <DeviceSwitch device={device} onChange={setDevice} dark />
        <button onClick={() => window.close()} className="rounded-md bg-white/10 px-3 py-1 text-xs font-semibold hover:bg-white/20">
          Fermer (Échap)
        </button>
      </div>
      {device === 'mobile' ? (
        <div className="mx-auto my-6 w-[390px] max-w-full overflow-hidden rounded-[28px] border-[6px] border-slate-400 bg-white shadow-lg" data-testid="mobile-frame">
          {site}
        </div>
      ) : (
        site
      )}
    </div>
  )
}
