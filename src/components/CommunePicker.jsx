import { useState } from 'react'
import { Search, Sparkles, ChevronDown } from 'lucide-react'
import { norm, fmtNum } from '../lib/data'
import Queue from './Queue'

// Étape 1 : recherche + recommandations (communes à créer les mieux classées) + classement complet replié
export default function CommunePicker({ rows, current, geoState, onPick }) {
  const [q, setQ] = useState('')
  const query = norm(q)
  const list = query ? rows.filter((r) => norm(r.name).includes(query) || r.cp.startsWith(q.trim())).slice(0, 6) : rows.filter((r) => r.status === 'a_creer').slice(0, 5)

  return (
    <div data-tour="picker">
      <label className="relative block">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une commune ou un code postal"
          aria-label="Rechercher une commune"
          className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
      </label>

      <p className="mt-4 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
        {query ? (
          `Résultats (${list.length})`
        ) : (
          <>
            <Sparkles size={13} className="text-indigo-500" /> Recommandations prioritaires
          </>
        )}
      </p>
      {list.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Aucune commune ne correspond à cette recherche.</p>
      ) : (
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {list.map((r) => {
            const on = r.name === current
            return (
              <li key={r.name}>
                <button
                  onClick={() => onPick(r.name)}
                  aria-pressed={on}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                    on ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{r.name}</span>
                    <span className="block text-xs text-slate-500">
                      {r.depName} · {r.nbAnnonces ? `${r.nbAnnonces} annonce${r.nbAnnonces > 1 ? 's' : ''}` : 'sans annonce'}
                      {r.population ? ` · ${fmtNum(r.population)} hab.` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold tabular-nums text-indigo-700">{r.score}</span>
                    <span className="block text-[10px] uppercase tracking-wide text-slate-400">score</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <details className="group mt-3">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900">
          Voir le classement complet ({rows.length} communes)
          <ChevronDown size={15} className="transition group-open:rotate-180" />
        </summary>
        <div className="mt-3">
          <Queue rows={rows} geoState={geoState} onOpen={onPick} />
        </div>
      </details>
    </div>
  )
}
