import { useState } from 'react'
import { Check, Plus, Pencil, AlertCircle, HelpCircle } from 'lucide-react'
import { fmtEur, fmtNum, SCORE_WEIGHTS } from '../lib/data'

const TONES = {
  emerald: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-700',
  slate: 'bg-slate-100 text-slate-500',
}

function ScoreBadge({ row }) {
  const [open, setOpen] = useState(false)
  const b = row.breakdown
  return (
    <div className="relative flex items-center gap-1.5">
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TONES[row.level.tone]}`}>{row.level.label}</span>
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        aria-label={`Détail du score de ${row.name}`}
        className="text-slate-400 hover:text-indigo-600"
      >
        <HelpCircle size={15} />
      </button>
      {open && (
        <div className="absolute left-0 top-6 z-10 w-72 rounded-lg border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-600 shadow-lg">
          <p className="font-semibold text-slate-900">
            Score : {b.total} / 100 pour {row.name}
          </p>
          <ul className="mt-1.5 space-y-1">
            <li>
              Annonces Cimco actives : {row.nbAnnonces} sur {b.maxAnn} au maximum, soit {b.annonces} / {SCORE_WEIGHTS.annonces} points
            </li>
            <li>
              Population : {row.population ? `${fmtNum(row.population)} habitants (échelle logarithmique, maximum ${fmtNum(b.maxPop)})` : 'indisponible'}, soit {b.population} / {SCORE_WEIGHTS.population} points
            </li>
          </ul>
          <p className="mt-2 text-slate-400">Haute : 75 et plus. Moyenne : 55 à 74. Basse : moins de 55. « À évaluer » tant que la population est inconnue.</p>
        </div>
      )}
    </div>
  )
}

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
      <div data-tour="queue" className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
        <div>
          <h2 className="font-semibold">File de priorité</h2>
          <p className="text-xs text-slate-500">Score sur 100 : annonces Cimco actives (30 points) + population de la commune (70 points, geo.api.gouv.fr). Cliquez sur ? pour le détail.</p>
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
                <td className="px-4 py-2.5 text-right tabular-nums">{r.annonce ? fmtEur(r.annonce.budget) : <span className="text-slate-300">Aucune annonce</span>}</td>
                <td className="px-4 py-2.5">
                  <ScoreBadge row={r} />
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
