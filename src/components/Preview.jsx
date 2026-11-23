import { Home, Ruler, Phone } from 'lucide-react'
import { budgetBreakdown } from '../lib/page'
import { fmtEur } from '../lib/data'

export default function Preview({ commune: c, page, dvf }) {
  const a = c.annonce
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="bg-slate-900 px-6 py-8 text-white">
        <h1 className="text-2xl font-bold sm:text-3xl">{page.h1}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">{page.intro}</p>
      </div>

      <div className="space-y-6 p-6">
        <section>
          <h2 className="text-lg font-semibold">Nos annonces à {c.name}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{page.local}</p>
          <div className="mt-3 rounded-lg border border-slate-200 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Annonce Cimco {a.ref}</p>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span className="flex items-center gap-1.5"><Home size={15} className="text-indigo-500" /> Maison {a.maison_m2} m²</span>
              {a.terrain_m2 && <span className="flex items-center gap-1.5"><Ruler size={15} className="text-indigo-500" /> Terrain {a.terrain_m2} m²</span>}
              <span className="font-semibold">{fmtEur(a.budget)}</span>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Budget terrain et maison</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{page.budget}</p>
          <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
            {budgetBreakdown(c, dvf).map((r) => (
              <li key={r.label} className="flex justify-between gap-4 px-4 py-2.5">
                <span className="text-slate-600">{r.label}</span>
                <span className="shrink-0 font-semibold">{r.value}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl bg-indigo-50 p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-indigo-900">
            <Phone size={18} /> Demander à être rappelé
          </h2>
          <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
            <input className="rounded-lg border border-indigo-100 bg-white px-3 py-2 text-sm" placeholder="Nom" />
            <input className="rounded-lg border border-indigo-100 bg-white px-3 py-2 text-sm" placeholder="Téléphone" />
            <input className="rounded-lg border border-indigo-100 bg-white px-3 py-2 text-sm sm:col-span-2" placeholder="E-mail" />
            <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white sm:col-span-2">Demander à être rappelé</button>
          </form>
          <p className="mt-2 text-xs text-indigo-700">Aperçu : le formulaire réel est un module HubSpot.</p>
        </section>
      </div>
    </article>
  )
}
