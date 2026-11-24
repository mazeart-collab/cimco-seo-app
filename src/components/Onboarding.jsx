import { useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { Lightbulb, Wrench, Rocket, Compass, ArrowRight, X } from 'lucide-react'

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

// Contenu des cartes : paragraphes (avec intitulé en gras facultatif) puis liste éventuelle
const BLOCKS = [
  {
    icon: Lightbulb,
    title: 'La genèse du projet',
    paras: [
      ['Le constat :', "L'acquisition repose aujourd'hui largement sur SeLoger et Leboncoin. C'est efficace et c'est la norme du secteur, mais cela crée une dépendance forte : si ces plateformes changent leurs tarifs ou leurs règles, le canal est immédiatement impacté."],
      ['Le choix du SEO local :', "Le référencement naturel est un actif durable, cumulatif et indépendant. Pour Cimco, il doit être local afin de capter l'intention précise d'un particulier qui cherche à faire construire dans une commune précise."],
      ['La réponse :', 'Une page dédiée par commune. Rédiger chaque page à la main est chronophage, et Google pénalise les pages copiées-collées où seul le nom de la ville change. Cet outil génère des pages uniques, ancrées dans des données réelles et prêtes à publier.'],
    ],
  },
  {
    icon: Rocket,
    title: 'À quoi ça sert',
    paras: [['Cet outil est un', 'constructeur de pages SEO locales pour Cimco', '. Concrètement, il fait quatre choses :']],
    list: [
      ['Recommander les communes prioritaires :', 'Il identifie et suggère les pages locales les plus pertinentes à créer en priorité selon la présence et le potentiel du secteur.'],
      ['Croiser des données réelles :', 'Pour chaque commune, il récupère automatiquement les données publiques (prix des terrains et des maisons via DVF / data.gouv.fr, population via geo.api.gouv.fr, visuels locaux via Wikimedia) et les croise avec les annonces Cimco disponibles sur la zone.'],
      ["Générer la page avec l'IA :", "L'outil est directement connecté à l'API Claude (Anthropic) pour rédiger un contenu unique à partir de ces données croisées, en évitant le contenu dupliqué sanctionné par Google."],
      ['Livrer un rendu prêt à publier :', 'En quelques secondes, il produit une page complète (chiffres clés, annonces locales, ancrage territorial, FAQ et formulaire de rappel) exportable en HTML/CSS pour HubSpot.'],
    ],
  },
  {
    icon: Wrench,
    title: 'Comment c’est fait',
    paras: [[null, "Prototype conçu rapidement en mobilisant l'IA sur toute la chaîne (conception et arbitrage avec Gemini, développement assisté avec Claude Code) et en combinant plusieurs briques techniques :"]],
    list: [
      ['Interface & hébergement :', 'React, Vite, Tailwind CSS, déployé sur Vercel avec des fonctions serveur sécurisant les clés API.'],
      ['Rédaction IA :', 'API Anthropic Claude branchée à la demande, avec un coût marginal très faible (~0,01 € par page) et des garde-fous anti-hallucination sur les chiffres.'],
      ['Données réelles (APIs) :', 'Prix immobiliers issus des données DVF (data.gouv.fr), informations communales via geo.api.gouv.fr, et visuels libres de droits via Wikimedia Commons (crédits inclus).'],
    ],
  },
  {
    icon: Compass,
    title: "Limites actuelles & pistes d'évolution",
    paras: [[null, 'Cet outil est une V1 fonctionnelle, pensée pour être améliorée en conditions réelles :']],
    list: [
      ["Base d'annonces statique :", "Les annonces sont extraites du site à un instant T ; l'étape suivante consiste à brancher le flux ou la base de données Cimco en direct."],
      ['Intégration HubSpot :', "Le code exporté devra être adapté à la structure réelle du thème HubSpot de Cimco, puis automatisé (création de brouillons via l'API HubSpot)."],
      ['Calibrage métier :', "Réalisé en temps limité, le discours (arguments commerciaux, objections clients, spécificités terrain) gagne à être affiné avec l'équipe."],
      ['Visuels & petites communes :', 'Remplacer à terme les photos Wikimedia par de vraies réalisations Cimco, et ajouter un repli départemental quand les ventes DVF sont trop rares sur une commune.'],
      ['Boucle de mesure :', "L'outil n'est pas encore relié à la Search Console ni à HubSpot pour identifier quels angles rédactionnels génèrent le plus de clics et de demandes de rappel."],
    ],
  },
]

// Écran de présentation plein écran (étape 1)
export function IntroScreen({ onStart, onSkip }) {
  const startRef = useRef(null)
  // Focus clavier sur le bouton principal sans faire défiler l'écran jusqu'en bas
  useEffect(() => startRef.current?.focus({ preventScroll: true }), [])
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
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-600">Un prototype fonctionnel pour industrialiser le SEO local de Cimco — sa genèse, son architecture, ses usages et ses limites actuelles.</p>

        <div className="mt-8 flex w-full max-w-3xl flex-col gap-6 text-left">
          {BLOCKS.map(({ icon: Icon, title, paras, list }, i) => (
            <section key={title} className="flex flex-col rounded-[20px] border border-[#1a1a18]/[.08] bg-white p-6 sm:p-7 shadow-[0_1px_2px_rgba(26,26,24,.04),0_8px_24px_rgba(26,26,24,.06)]">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#cfe3ec] text-[#4a6a78]">
                  <Icon size={19} />
                </span>
                <span className="text-xs font-semibold text-slate-400">0{i + 1}</span>
              </div>
              <h2 className="mt-4 font-display text-lg font-extrabold">{title}</h2>
              {paras.map((para) => {
                // [intitulé en gras, texte] ou [texte avant, passage en gras, texte après]
                const [pre, bold, post] = para.length === 3 ? para : [null, ...para]
                return (
                  <p key={para.join('|')} className="mt-2.5 text-sm leading-relaxed text-slate-600">
                    {pre && `${pre} `}
                    {bold && <strong className="font-semibold text-[#1a1a18]">{bold}</strong>}
                    {post && (/^[.,;:]/.test(post) ? post : ` ${post}`)}
                  </p>
                )
              })}
              {list && (
                <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-slate-600">
                  {list.map(([k, v]) => (
                    <li key={k} className="flex gap-2.5">
                      <span className="mt-[.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#8fabb9]" />
                      <span>
                        <strong className="font-semibold text-[#1a1a18]">{k}</strong> {v}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <button
          ref={startRef}
          onClick={onStart}
          className="mt-10 inline-flex items-center gap-2 rounded-full bg-[#4a6a78] px-8 py-4 outline-none focus-visible:ring-4 focus-visible:ring-[#8fabb9]/60 text-base font-bold text-white shadow-[0_8px_24px_rgba(74,106,120,.35)] transition hover:-translate-y-px hover:brightness-95"
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
