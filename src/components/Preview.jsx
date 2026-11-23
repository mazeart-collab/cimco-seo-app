import { Home, Users, Landmark, Wallet, ChevronDown, CheckCircle2 } from 'lucide-react'

const iconFor = (label) => (label === 'Population' ? Users : label === 'Budget projet Cimco' ? Wallet : label.includes('maisons') ? Home : Landmark)

const H2 = 'font-display text-2xl font-extrabold before:mb-3 before:block before:h-[3px] before:w-10 before:rounded before:bg-[#8fabb9] before:content-[""]'
const CARD = 'rounded-3xl border border-[#1a1a18]/10 bg-white'

function Band({ className = '', children }) {
  return (
    <section className={`px-5 py-10 @min-[560px]:px-8 @min-[560px]:py-14 ${className}`}>
      <div className="mx-auto max-w-4xl">{children}</div>
    </section>
  )
}

export default function Preview({ s }) {
  return (
    <div className="@container bg-[#fbfaf8] text-[#1a1a18]">
      <Band className="bg-[#1a1a18] text-white">
        <h1 className="break-words font-display text-3xl font-extrabold leading-tight @min-[560px]:text-4xl">{s.h1}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#cfe3ec] @min-[560px]:text-base">{s.intro}</p>
        {s.image && (
          <figure className="relative mt-8 overflow-hidden rounded-3xl">
            <img src={s.image.src} alt={s.image.alt} className="max-h-96 w-full object-cover" />
            {s.image.credit && (
              <span
                tabIndex={0}
                role="note"
                aria-label="Crédit photo"
                className="group/credit absolute bottom-3 right-3 flex h-6 w-6 cursor-help items-center justify-center rounded-full bg-[#1a1a18]/55 text-xs font-semibold text-white outline-none hover:bg-[#1a1a18]/85 focus:bg-[#1a1a18]/85"
              >
                ?
                <span className="absolute bottom-8 right-0 hidden w-max max-w-64 rounded-lg bg-[#1a1a18] px-2.5 py-1.5 text-left text-xs font-normal leading-snug group-hover/credit:block group-focus/credit:block">
                  {s.image.credit}
                </span>
              </span>
            )}
          </figure>
        )}
      </Band>

      {s.figures.length > 0 && (
        <Band>
          <h2 className={H2}>{s.figuresTitle}</h2>
          <div className="mt-5 grid gap-4 @min-[560px]:grid-cols-2">
            {s.figures.map((f) => {
              const Icon = iconFor(f.label)
              return (
                <div key={f.label} className={`${CARD} p-5`}>
                  <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-[#57534c]">
                    <Icon size={13} /> {f.label}
                  </p>
                  <p className="mt-1 font-display text-2xl font-extrabold text-[#4a6a78]">{f.value}</p>
                  <p className="text-xs text-[#57534c]">{f.note}</p>
                </div>
              )
            })}
          </div>
        </Band>
      )}

      <Band className="bg-[#f4f3ef]">
        <h2 className={H2}>{s.localTitle}</h2>
        <p className="mt-3 text-sm leading-relaxed text-[#57534c]">{s.local}</p>
        <div className="mt-5 grid gap-4 @min-[560px]:grid-cols-2">
          {s.listings.map((l) => (
            <a
              key={l.ref}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`block ${CARD} p-5 transition hover:-translate-y-0.5 hover:border-[#4a6a78] hover:shadow-lg ${l.here ? 'border-[#4a6a78] ring-1 ring-[#4a6a78]' : ''}`}
            >
              <p className="text-sm font-semibold">{l.title}</p>
              <p className="mt-1 font-display text-xl font-extrabold text-[#4a6a78]">{l.budget}</p>
              <p className="mt-2 text-xs text-[#57534c]">Réf. {l.ref}</p>
              <p className="mt-1 text-xs text-[#57534c]">Voir sur cimco.fr →</p>
            </a>
          ))}
        </div>
      </Band>

      <Band>
        <h2 className={H2}>{s.budgetTitle}</h2>
        <p className="mt-3 text-sm leading-relaxed text-[#57534c]">{s.budget}</p>
        {s.breakdown.length > 0 && (
          <ul className={`mt-5 divide-y divide-[#1a1a18]/10 overflow-hidden text-sm ${CARD}`}>
            {s.breakdown.map((r) => (
              <li key={r.label} className="flex justify-between gap-4 px-5 py-3">
                <span className="text-[#57534c]">{r.label}</span>
                <span className="shrink-0 font-semibold">{r.value}</span>
              </li>
            ))}
          </ul>
        )}
      </Band>

      <Band className="bg-[#4a6a78] text-white">
        <h2 className={`${H2} before:bg-[#cfe3ec]`}>{s.whyTitle}</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/90">{s.why}</p>
        <ul className="mt-5 grid gap-3 @min-[560px]:grid-cols-3">
          {s.whyPoints.map((p) => (
            <li key={p} className="flex items-start gap-2 rounded-2xl bg-white/15 px-4 py-3 text-sm font-semibold">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#cfe3ec]" /> {p}
            </li>
          ))}
        </ul>
      </Band>

      <Band className="bg-[#f4f3ef]">
        <h2 className={H2}>{s.faqTitle}</h2>
        <div className="mt-5 space-y-3">
          {s.faq.map((f) => (
            <details key={f.q} className={`group ${CARD} px-5 py-4`}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
                {f.q}
                <ChevronDown size={16} className="shrink-0 text-[#4a6a78] transition group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-[#57534c]">{f.a}</p>
            </details>
          ))}
        </div>
      </Band>

      <Band className="bg-[#cfe3ec]">
        <h2 className={H2}>{s.ctaTitle}</h2>
        <form className="mt-5 grid gap-3 @min-[560px]:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
          <input className="rounded-2xl border border-[#1a1a18]/10 bg-white px-4 py-3 text-sm" placeholder="Nom" />
          <input className="rounded-2xl border border-[#1a1a18]/10 bg-white px-4 py-3 text-sm" placeholder="Téléphone" />
          <input className="rounded-2xl border border-[#1a1a18]/10 bg-white px-4 py-3 text-sm @min-[560px]:col-span-2" placeholder="E-mail" />
          <button className="rounded-full bg-[#4a6a78] px-5 py-3 text-sm font-bold text-white hover:brightness-90 @min-[560px]:col-span-2">Demander à être rappelé</button>
        </form>
        <p className="mt-3 text-xs text-[#57534c]">{s.ctaNote}</p>
      </Band>
    </div>
  )
}
