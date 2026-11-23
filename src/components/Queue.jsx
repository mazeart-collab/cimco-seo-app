import { useState } from 'react'
import { Check, Plus, Pencil, AlertCircle } from 'lucide-react'
import { fmtEur, fmtNum } from '../lib/data'

const FILTERS = [
  ['all', 'Toutes'],
  ['a_creer', 'À créer'],
  ['traitee', 'Traitées'],
]

export default function Queue({ rows, geoState, onOpen }) {
  const [filter, setFilter] = useState('a_creer')
  const shown = rows.filter((r) => filter === 'all' || r.status === filter)
  const count = (f) => rows.filter((r) => f === 'all' || r.status === f).length

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
        <div>
          <h2 className="font-semibold">File de priorité</h2>
          <p className="text-xs text-slate-500">Classement : annonces Cimco actives puis population (geo.api.gouv.fr)</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {FILTERS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`rounded-md px-3 py-1 text-sm font-medium ${filter === id ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {label} <span className="text-xs text-slate-400">{count(id)}</span>
            </button>
          ))}
        </div>
      </div>

      {geoState === 'partial' && (
        <p className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          <AlertCircle size={14} /> La population n'a pas pu être récupérée pour toutes les communes (geo.api.gouv.fr injoignable). Le classement s'appuie sur les données disponibles.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">#</th>
              <th className="px-4 py-2.5">Commune</th>
              <th className="px-4 py-2.5">Dép.</th>
              <th className="px-4 py-2.5 text-right">Population</th>
              <th className="px-4 py-2.5 text-right">Budget annonce</th>
              <th className="px-4 py-2.5">Potentiel SEO</th>
              <th className="px-4 py-2.5">Statut</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.map((r, i) => (
              <tr key={r.name} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                <td className="px-4 py-2.5 font-medium">{r.name}</td>
                <td className="px-4 py-2.5 text-slate-500">{r.dep}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.population ? fmtNum(r.population) : <span className="text-slate-300">n.d.</span>}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{fmtEur(r.annonce.budget)}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: r.score + '%' }} />
                    </div>
                    <span className="text-xs tabular-nums text-slate-500">{r.score}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  {r.status === 'traitee' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      <Check size={12} /> Traitée
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">À créer</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => onOpen(r.name)}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${
                      r.status === 'traitee' ? 'border border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {r.status === 'traitee' ? <Pencil size={12} /> : <Plus size={12} />}
                    {r.status === 'traitee' ? 'Modifier' : 'Créer'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
