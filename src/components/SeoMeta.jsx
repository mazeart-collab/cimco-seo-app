import { useState } from 'react'
import { Copy, Check, ShieldCheck, AlertTriangle } from 'lucide-react'
import { norm } from '../lib/data'

// Plages recommandées : vert dans la plage, orange en dehors
const RANGES = { title: [45, 60], description: [130, 155] }

function Counter({ n, range }) {
  const ok = n >= range[0] && n <= range[1]
  return (
    <span
      title={`Recommandé : ${range[0]} à ${range[1]} caractères`}
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
    >
      {n} car.
    </span>
  )
}

function Field({ label, value, range, id, copied, onCopy }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <div className="flex items-center gap-2">
          <Counter n={value.length} range={range} />
          <button
            onClick={() => onCopy(id, value)}
            className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            {copied === id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
            {copied === id ? 'Copié' : 'Copier'}
          </button>
        </div>
      </div>
      <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm leading-snug text-slate-800">{value}</p>
    </div>
  )
}

// Encart « Aperçu Google / Métadonnées HubSpot »
export default function SeoMeta({ commune, title, description, similarity, threshold }) {
  const [copied, setCopied] = useState(null)
  const copy = async (id, text) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const t = document.createElement('textarea')
      t.value = text
      document.body.appendChild(t)
      t.select()
      document.execCommand('copy')
      t.remove()
    }
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const pct = Math.round(similarity.score * 100)
  const risky = similarity.score > threshold
  const slug = `faire-construire-a-${norm(commune).replace(/\s+/g, '-')}`

  return (
    <section data-tour="meta" className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Aperçu Google / Métadonnées HubSpot</h3>
        {!similarity.compared ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">Aucune autre page à comparer</span>
        ) : risky ? (
          <span
            title={`Titre et description comparés aux autres pages traitées, nom de commune masqué. Seuil d'alerte : ${Math.round(threshold * 100)} %.`}
            className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"
          >
            <AlertTriangle size={13} /> Trop proche de {similarity.name} ({pct} %)
          </span>
        ) : (
          <span
            title={`Similarité maximale : ${pct} % (${similarity.name}), nom de commune masqué. Seuil d'alerte : ${Math.round(threshold * 100)} %.`}
            className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
          >
            <ShieldCheck size={13} /> Unique ({pct} %)
          </span>
        )}
      </div>

      {/* Mini aperçu de résultat de recherche */}
      <div className="mt-4 rounded-xl border border-slate-100 bg-white p-4 font-[Arial,sans-serif]">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white">
            <img src="/cimco-logo.webp" alt="" className="h-4 w-auto" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="text-sm text-[#202124]">CIMCO</p>
            <p className="truncate text-xs text-[#4d5156]">https://www.cimco.fr › {slug}</p>
          </div>
        </div>
        <p className="mt-2 line-clamp-1 text-xl leading-snug text-[#1a0dab]">{title}</p>
        <p className="mt-1 line-clamp-2 text-sm leading-normal text-[#4d5156]">{description}</p>
      </div>

      <div className="mt-4 space-y-3">
        <Field label="Meta Title" value={title} range={RANGES.title} id="title" copied={copied} onCopy={copy} />
        <Field label="Meta Description" value={description} range={RANGES.description} id="description" copied={copied} onCopy={copy} />
      </div>
      {risky && (
        <p className="mt-3 text-xs text-amber-700">Formule trop générique par rapport à {similarity.name}. Relancez la génération ou demandez dans les consignes une accroche différente.</p>
      )}
    </section>
  )
}
