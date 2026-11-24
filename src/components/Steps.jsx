import { Check, Lock } from 'lucide-react'

export const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60'
export const BTN_SECONDARY =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60'

export const STEP_LABELS = ['Choisir une commune', 'Configurer et générer', 'Vérifier le SEO et le rendu', 'Exporter vers HubSpot']

// Barre de progression 1 → 2 → 3 → 4 (cliquable : fait défiler jusqu'à l'étape)
export function Stepper({ done }) {
  const active = done.findIndex((d) => !d)
  return (
    <nav data-tour="stepper" aria-label="Étapes" className="sticky top-0 z-20 border-b border-[#1a1a1812] bg-white/90 backdrop-blur">
      <ol className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-4 py-2.5 sm:gap-2">
        {STEP_LABELS.map((label, i) => {
          const isDone = done[i]
          const isActive = i === active
          return (
            <li key={label} className="flex shrink-0 items-center gap-1 sm:gap-2">
              {i > 0 && <span className={`h-px w-4 sm:w-8 ${done[i - 1] ? 'bg-indigo-400' : 'bg-slate-200'}`} />}
              <a
                href={`#step-${i + 1}`}
                onClick={(e) => {
                  e.preventDefault()
                  document.getElementById(`step-${i + 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className={`flex items-center gap-2 rounded-full px-2 py-1 text-xs font-medium sm:text-sm ${isActive ? 'bg-indigo-50 text-indigo-800' : isDone ? 'text-slate-700' : 'text-slate-400'}`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    isDone ? 'bg-indigo-600 text-white' : isActive ? 'border-2 border-indigo-600 text-indigo-700' : 'border border-slate-300 text-slate-400'
                  }`}
                >
                  {isDone ? <Check size={13} /> : i + 1}
                </span>
                <span className={isActive ? '' : 'hidden md:inline'}>{label}</span>
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// Carte d'étape numérotée ; verrouillée tant que l'étape précédente n'est pas faite
export function StepCard({ n, title, hint, locked, lockedText, children }) {
  return (
    <section id={`step-${n}`} data-tour={`step-${n}`} className="scroll-mt-16 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <header className="flex items-start gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${locked ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white'}`}>{n}</span>
        <div className="min-w-0">
          <h2 className={`text-lg font-semibold leading-tight ${locked ? 'text-slate-400' : ''}`}>{title}</h2>
          {hint && <p className="mt-0.5 text-sm text-slate-500">{hint}</p>}
        </div>
      </header>
      {locked ? (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
          <Lock size={15} className="shrink-0" /> {lockedText}
        </p>
      ) : (
        <div className="mt-5">{children}</div>
      )}
    </section>
  )
}
