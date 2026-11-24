import { useEffect } from 'react'
import { flushSync } from 'react-dom'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { Lightbulb, Wrench, Rocket, ArrowRight, X } from 'lucide-react'

export const ONBOARDING_KEY = 'cimco_onboarding_done'

export const isOnboardingDone = () => {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'true'
  } catch {
    return true
  }
}

export const markOnboardingDone = () => {
  try {
    localStorage.setItem(ONBOARDING_KEY, 'true')
  } catch {
    /* stockage indisponible */
  }
}

const BLOCKS = [
  {
    icon: Lightbulb,
    title: 'La genèse du projet',
    text: "Cimco a besoin de pages SEO locales de qualité pour attirer des acheteurs sans dépendre uniquement de SeLoger et Leboncoin. Écrire chaque page à la main prend du temps, et le copier-coller générique est sanctionné par Google. Cette app produit des pages propres à chaque commune, sans partir d'une feuille blanche.",
  },
  {
    icon: Wrench,
    title: 'Comment c’est fait',
    list: [
      ['Développement', 'assisté par IA avec Claude (React, Vite, Tailwind CSS)'],
      ['Hébergement', 'Vercel, avec des fonctions serveur qui gardent la clé API'],
      ['Rédaction', "API Anthropic Claude, appelée seulement à la demande et avec une limite d'utilisation"],
      ['Prix immobiliers', 'données réelles DVF publiées sur data.gouv.fr, en moyennes par commune'],
      ['Communes', 'population et codes officiels via geo.api.gouv.fr'],
      ['Visuels', 'photos libres de Wikimedia Commons, crédits inclus'],
    ],
  },
  {
    icon: Rocket,
    title: 'À quoi ça sert',
    text: "Générer en quelques secondes une page locale clé en main, en HTML et CSS prêts à intégrer dans HubSpot. Chaque page est enrichie de vraies données de marché et des annonces Cimco du secteur, puis contrôlée contre le contenu dupliqué. Elle est pensée pour le référencement et la conversion.",
  },
]

// Écran de présentation plein écran (étape 1)
export function IntroScreen({ onStart, onSkip }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && onSkip()
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onSkip])

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="intro-title" className="fixed inset-0 z-[100] overflow-y-auto bg-[#fbfaf8]">
      <button
        onClick={onSkip}
        className="fixed right-4 top-4 z-10 flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
      >
        Passer <X size={14} />
      </button>
      <div className="mx-auto flex min-h-full max-w-5xl flex-col items-center justify-center px-5 py-10 text-center">
        <img src="/cimco-logo.webp" alt="Cimco" width="118" height="132" className="h-14 w-auto" />
        <p className="mt-6 text-xs font-semibold uppercase tracking-[.2em] text-[#4a6a78]">Cimco SEO Local</p>
        <h1 id="intro-title" className="mt-2 max-w-2xl font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          Des pages « Faire construire à [commune] » prêtes à publier
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate-600">En deux minutes : pourquoi cet outil existe, comment il fonctionne, puis une visite guidée de l'interface.</p>

        <div className="mt-8 grid w-full gap-4 text-left md:grid-cols-3">
          {BLOCKS.map(({ icon: Icon, title, text, list }, i) => (
            <section key={title} className="flex flex-col rounded-[20px] border border-[#1a1a18]/[.08] bg-white p-6 shadow-[0_1px_2px_rgba(26,26,24,.04),0_8px_24px_rgba(26,26,24,.06)]">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#cfe3ec] text-[#4a6a78]">
                  <Icon size={19} />
                </span>
                <span className="text-xs font-semibold text-slate-400">0{i + 1}</span>
              </div>
              <h2 className="mt-4 font-display text-lg font-extrabold">{title}</h2>
              {text && <p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>}
              {list && (
                <ul className="mt-2 space-y-2 text-sm leading-snug text-slate-600">
                  {list.map(([k, v]) => (
                    <li key={k}>
                      <strong className="font-semibold text-[#1a1a18]">{k} :</strong> {v}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <button
          onClick={onStart}
          autoFocus
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#4a6a78] px-8 py-4 text-base font-bold text-white shadow-[0_8px_24px_rgba(74,106,120,.35)] transition hover:-translate-y-px hover:brightness-95"
        >
          Commencer l'onboarding <ArrowRight size={18} />
        </button>
      </div>
    </div>
  )
}

// Tour guidé (étape 2) : chaque étape indique l'onglet où se trouve son élément
const STEPS = [
  { tab: 'queue', el: '[data-tour="tabs"]', title: 'Deux espaces de travail', text: "La file de priorité classe les communes, l'éditeur sert à créer et ajuster chaque page." },
  { tab: 'queue', el: '[data-tour="banner"]', title: 'La commune recommandée', text: "L'outil propose la prochaine page à créer, avec ses chiffres clés. Un clic ouvre directement l'éditeur." },
  { tab: 'queue', el: '[data-tour="queue"]', title: 'La file de priorité', text: 'Les communes sont classées par potentiel SEO : annonces Cimco actives et population. Cliquez sur une ligne pour ouvrir sa page.' },
  { tab: 'editor', el: '[data-tour="commune"]', title: 'Choisir la commune', text: 'Sélectionnez la commune à travailler. Ses données réelles (population, prix moyens DVF, annonce Cimco) se chargent ici.' },
  { tab: 'editor', el: '[data-tour="photo"]', title: 'Illustrer la page', text: 'Choisissez une photo libre de la commune, ou collez votre propre image avec son crédit.' },
  { tab: 'editor', el: '[data-tour="consignes"]', title: "Donner ses consignes à l'IA", text: 'Précisez le ton, un angle ou une section à revoir. Claude rédige à partir des données de la commune.' },
  { tab: 'editor', el: '[data-tour="generate"]', title: 'Générer la page', text: 'Un clic lance la rédaction, et la page est enregistrée. Sans IA disponible, une version construite sur les données réelles reste affichée.' },
  { tab: 'editor', el: '[data-tour="similarity"]', title: 'Contrôler la similarité', text: "Chaque page est comparée aux pages déjà traitées. Au-delà de 40 %, l'outil alerte d'un risque de contenu dupliqué." },
  { tab: 'editor', el: '[data-tour="preview"]', title: "L'aperçu en direct", text: 'Le rendu final de la page, en version desktop ou mobile, et en plein écran dans le cadre du site.' },
  { tab: 'editor', el: '[data-tour="export"]', title: 'Exporter vers HubSpot', text: 'Copiez le HTML brut pour un module texte, ou le HTML autonome avec son CSS pour un module personnalisé.' },
  { tab: null, el: '[data-tour="guide"]', title: 'Revoir ce guide', text: 'Ce bouton relance la présentation et la visite à tout moment, pratique pour une démonstration.' },
]

export function startTour(setTab) {
  const goTab = (tab) => tab && flushSync(() => setTab(tab))
  const tour = driver({
    showProgress: true,
    progressText: '{{current}} / {{total}}',
    nextBtnText: 'Suivant',
    prevBtnText: 'Précédent',
    doneBtnText: 'Terminer',
    showButtons: ['next', 'previous'],
    allowClose: true,
    overlayOpacity: 0.55,
    stagePadding: 6,
    stageRadius: 14,
    smoothScroll: true,
    popoverClass: 'cimco-tour',
    steps: STEPS.map((s) => ({
      // L'onglet est affiché (rendu synchrone) avant que driver.js ne mesure l'élément
      element: () => {
        goTab(s.tab)
        return document.querySelector(s.el)
      },
      popover: { title: s.title, description: s.text },
    })),
    onPopoverRender: (popover) => {
      const skip = document.createElement('button')
      skip.type = 'button'
      skip.className = 'cimco-tour-skip'
      skip.textContent = 'Passer'
      skip.addEventListener('click', () => tour.destroy())
      popover.footerButtons.prepend(skip)
    },
    // Fin du tour, bouton Passer, Échap ou clic sur le fond : l'onboarding est marqué comme fait
    onDestroyed: () => {
      markOnboardingDone()
      goTab('queue')
    },
  })
  goTab('queue')
  tour.drive()
  return tour
}
