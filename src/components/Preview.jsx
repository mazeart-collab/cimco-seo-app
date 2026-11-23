import { Home, Phone, Users, Landmark, Wallet, ChevronDown, CheckCircle2 } from 'lucide-react'

const iconFor = (label) => (label === 'Population' ? Users : label === 'Budget projet Cimco' ? Wallet : label.includes('maisons') ? Home : Landmark)

export default function Preview({ s }) {
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="bg-slate-900 px-6 py-8 text-white">
        <h1 className="text-2xl font-bold sm:text-3xl">{s.h1}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">{s.intro}</p>
      </div>

      {s.image && (
        <figure>
          <img src={s.image.src} alt={s.image.alt} className="max-h-72 w-full object-cover" />
          <figcaption className="border-b border-slate-100 px-6 py-2 text-xs text-slate-500">
            {s.image.legend}. {s.image.credit} (
            <a href={s.image.pageUrl} target="_blank" rel="noreferrer" className="text-indigo-600 underline">
              source
            </a>
            )
          </figcaption>
        </figure>
      )}

      <div className="space-y-8 p-6">
        <section>
          <h2 className="text-lg font-semibold">{s.figuresTitle}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {s.figures.map((f) => {
              const Icon = iconFor(f.label)
              return (
                <div key={f.label} className="rounded-lg border border-slate-200 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                    <Icon size={13} /> {f.label}
                  </p>
                  <p className="mt-1 text-lg font-bold">{f.value}</p>
                  <p className="text-xs text-slate-500">{f.note}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">{s.localTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{s.local}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {s.listings.map((l) => (
              <a
                key={l.ref}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`block rounded-lg border p-3 transition hover:border-indigo-400 hover:shadow-md ${l.here ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200'}`}
              >
                <p className="text-sm font-semibold">{l.title}</p>
                <p className="mt-1 text-base font-bold">{l.budget}</p>
                <p className="mt-2 text-xs text-slate-400">Réf. {l.ref}</p>
                <p className="mt-1 text-xs text-slate-500">Voir sur cimco.fr →</p>
              </a>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">{s.budgetTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{s.budget}</p>
          <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
            {s.breakdown.map((r) => (
              <li key={r.label} className="flex justify-between gap-4 px-4 py-2.5">
                <span className="text-slate-600">{r.label}</span>
                <span className="shrink-0 font-semibold">{r.value}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl bg-slate-50 p-5">
          <h2 className="text-lg font-semibold">{s.whyTitle}</h2>
          <p className="mt-2 text-sm text-slate-700">{s.why}</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {s.whyPoints.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-indigo-600" /> {p}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">{s.faqTitle}</h2>
          <div className="mt-3 space-y-2">
            {s.faq.map((f) => (
              <details key={f.q} className="group rounded-lg border border-slate-200 px-4 py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
                  {f.q}
                  <ChevronDown size={16} className="text-slate-400 transition group-open:rotate-180" />
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="rounded-xl bg-indigo-50 p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-indigo-900">
            <Phone size={18} /> {s.ctaTitle}
          </h2>
          <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
            <input className="rounded-lg border border-indigo-100 bg-white px-3 py-2 text-sm" placeholder="Nom" />
            <input className="rounded-lg border border-indigo-100 bg-white px-3 py-2 text-sm" placeholder="Téléphone" />
            <input className="rounded-lg border border-indigo-100 bg-white px-3 py-2 text-sm sm:col-span-2" placeholder="E-mail" />
            <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white sm:col-span-2">Demander à être rappelé</button>
          </form>
          <p className="mt-2 text-xs text-indigo-700">{s.ctaNote}</p>
        </section>
      </div>
    </article>
  )
}
