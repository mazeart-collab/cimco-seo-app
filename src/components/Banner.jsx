import { Sparkles, ArrowRight, Loader2 } from 'lucide-react'
import { fmtEur, fmtNum } from '../lib/data'

export default function Banner({ next, geoState, onCreate }) {
  if (!next) {
    return (
      <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
        Toutes les communes sont traitées.
      </section>
    )
  }
  const stats = [
    ['Population', next.population ? fmtNum(next.population) + ' hab.' : geoState === 'loading' ? 'Chargement…' : 'Indisponible'],
    ['Budget annonce Cimco', next.annonce ? fmtEur(next.annonce.budget) : 'Aucune annonce'],
    ['Département', `${next.depName} (${next.dep})`],
    ['Score SEO', next.score + ' / 100'],
  ]
  return (
    <section data-tour="banner" className="overflow-hidden rounded-3xl bg-[#1a1a18] p-5 text-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-indigo-300">
            <Sparkles size={14} /> Recommandation
            {geoState === 'loading' && <Loader2 size={13} className="animate-spin" />}
          </p>
          <h2 className="mt-1 text-xl font-semibold sm:text-2xl">Prochaine commune recommandée : {next.name}</h2>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            {stats.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-indigo-300">{k}</dt>
                <dd className="text-sm font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <button
          onClick={onCreate}
          className="flex items-center gap-2 rounded-lg bg-[#fbfaf8] px-4 py-2.5 text-sm font-semibold text-[#1a1a18] shadow-sm transition hover:bg-indigo-200"
        >
          Créer cette page maintenant <ArrowRight size={16} />
        </button>
      </div>
    </section>
  )
}
