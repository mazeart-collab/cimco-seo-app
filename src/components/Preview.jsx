import { Home, Users, Landmark, Wallet, ChevronDown, CheckCircle2, ArrowRight, ShieldCheck, MapPin, FileCheck2, MessagesSquare } from 'lucide-react'

const TRUST_ICON = { shield: ShieldCheck, pin: MapPin, doc: FileCheck2, chat: MessagesSquare }

const iconFor = (label) => (label === 'Population' ? Users : label === 'Budget projet Cimco' ? Wallet : label.includes('maisons') ? Home : Landmark)

const H2 = 'font-display text-2xl font-extrabold leading-tight tracking-tight @min-[560px]:text-3xl before:mb-3 before:block before:h-[3px] before:w-10 before:rounded before:bg-[#8fabb9] before:content-[""]'
const CARD = 'rounded-[20px] border border-[#1a1a18]/[.08] bg-white shadow-[0_1px_2px_rgba(26,26,24,.04),0_8px_24px_rgba(26,26,24,.06)]'
const P = 'mt-3 max-w-[70ch] text-[15px] leading-[1.75] text-[#57534c]'
const NOTE = 'mt-5 text-xs leading-normal text-[#6b665e]'
const BTN = 'inline-flex items-center gap-2 rounded-full bg-[#4a6a78] px-6 py-3.5 text-sm font-bold text-white shadow-[0_6px_18px_rgba(74,106,120,.28)] transition hover:-translate-y-px hover:brightness-95'

function Band({ className = '', id, children }) {
  return (
    <section id={id} className={`px-5 py-12 @min-[768px]:px-8 @min-[768px]:py-16 ${className}`}>
      <div className="mx-auto max-w-5xl">{children}</div>
    </section>
  )
}

// Ancre interne : défile dans le conteneur d'aperçu sans changer l'URL de l'app
const toContact = (e) => {
  e.preventDefault()
  e.currentTarget.closest('.cimco-preview')?.querySelector('#contact-cimco')?.scrollIntoView({ behavior: 'smooth' })
}

export default function Preview({ s }) {
  return (
    <div className="cimco-preview @container bg-[#fbfaf8] text-[#1a1a18] antialiased">
      <Band>
        <div className={`grid items-center gap-8 ${s.image ? '@min-[768px]:grid-cols-[1.05fr_.95fr] @min-[768px]:gap-12' : ''}`}>
          <div>
            <ul className="mb-4 flex flex-wrap gap-2">
              {s.badges.map((b) => (
                <li key={b} className="rounded-full border border-[#1a1a18]/[.08] bg-white px-3 py-1 text-xs font-semibold tracking-wide text-[#4a6a78]">
                  {b}
                </li>
              ))}
            </ul>
            <h1 className="break-words font-display text-3xl font-extrabold leading-[1.1] tracking-tight @min-[560px]:text-[2.75rem]">{s.h1}</h1>
            <p className="mt-4 max-w-[60ch] text-base leading-[1.75] text-[#57534c] @min-[560px]:text-[17px]">{s.intro}</p>
            <a href="#contact-cimco" onClick={toContact} className={`mt-6 ${BTN}`}>
              {s.heroCta} <ArrowRight size={16} />
            </a>
          </div>
          {s.image && (
            <figure className="relative overflow-hidden rounded-3xl shadow-[0_18px_40px_rgba(26,26,24,.14)]">
              <img src={s.image.src} alt={s.image.alt} className="aspect-[4/3] w-full object-cover" />
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
        </div>
      </Band>

      <section className="border-y border-[#1a1a18]/[.08] bg-white px-5 py-6 @min-[768px]:px-8">
        <ul className="mx-auto grid max-w-5xl gap-x-6 gap-y-4 @min-[560px]:grid-cols-2 @min-[900px]:grid-cols-4">
          {s.trust.map((t) => {
            const Icon = TRUST_ICON[t.icon] || ShieldCheck
            return (
              <li key={t.title} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#cfe3ec] text-[#4a6a78]">
                  <Icon size={18} />
                </span>
                <span>
                  <strong className="block font-display text-[15px] leading-snug">{t.title}</strong>
                  <span className="text-[13px] leading-snug text-[#57534c]">{t.text}</span>
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      {s.figures.length > 0 && (
        <Band className="bg-[#f4f3ef]">
          <h2 className={H2}>{s.figuresTitle}</h2>
          <div className="mt-6 grid gap-4 @min-[560px]:grid-cols-2 @min-[900px]:grid-cols-4">
            {s.figures.map((f) => {
              const Icon = iconFor(f.label)
              return (
                <div key={f.label} className={`${CARD} p-5`}>
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#6b665e]">
                    <Icon size={13} /> {f.label}
                  </p>
                  <p className="mt-1.5 font-display text-2xl font-extrabold text-[#4a6a78]">{f.value}</p>
                  <p className="mt-0.5 text-xs text-[#6b665e]">{f.note}</p>
                </div>
              )
            })}
          </div>
          {s.figuresNote && <p className={NOTE}>{s.figuresNote}</p>}
        </Band>
      )}

      <Band>
        <h2 className={H2}>{s.localTitle}</h2>
        <p className={P}>{s.local}</p>
        <div className="mt-6 grid gap-4 @min-[560px]:grid-cols-2 @min-[900px]:grid-cols-3">
          {s.listings.map((l) => (
            <a
              key={l.url + l.name}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex flex-col gap-1 ${CARD} p-5 transition hover:-translate-y-0.5 hover:border-[#4a6a78] hover:shadow-lg ${l.here ? 'border-[#4a6a78] ring-1 ring-[#4a6a78]' : ''}`}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#4a6a78]">{l.place}</span>
              <span className="text-sm font-semibold">{l.title}</span>
              <span className="font-display text-xl font-extrabold text-[#4a6a78]">{l.budget}</span>
              <span className="mt-2 text-sm font-semibold text-[#4a6a78]">Voir le projet →</span>
            </a>
          ))}
        </div>
        <div className="mt-7 text-center">
          <a
            href={s.listingsCta.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-[#4a6a78] bg-white px-6 py-3 text-sm font-bold text-[#4a6a78] transition hover:bg-[#4a6a78] hover:text-white"
          >
            {s.listingsCta.label} <ArrowRight size={16} />
          </a>
        </div>
      </Band>

      <Band className="bg-[#f4f3ef]">
        <h2 className={H2}>{s.budgetTitle}</h2>
        <p className={P}>{s.budget}</p>
        <ul className={`mt-6 divide-y divide-[#1a1a18]/[.08] overflow-hidden text-sm ${CARD}`}>
          {s.breakdown.map((r) => (
            <li key={r.label} className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-5 py-3.5">
              <span className="font-semibold">{r.label}</span>
              <span className="text-[#57534c]">{r.value}</span>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[20px] bg-white px-6 py-5">
          <p className="font-semibold">{s.midCtaTitle}</p>
          <a href="#contact-cimco" onClick={toContact} className="border-b-2 border-[#8fabb9] text-sm font-bold text-[#4a6a78] hover:border-[#4a6a78]">
            {s.midCta}
          </a>
        </div>
      </Band>

      <Band className="bg-[#4a6a78] text-white">
        <h2 className={`${H2} before:bg-[#cfe3ec]`}>{s.whyTitle}</h2>
        <p className="mt-3 max-w-[70ch] text-[15px] leading-[1.75] text-white/90">{s.why}</p>
        <p className="mt-4 max-w-[70ch] rounded-r-xl border-l-[3px] border-[#cfe3ec] bg-white/10 px-4 py-3 text-[15px] leading-relaxed text-white/90">{s.whyTransparency}</p>
        <ul className="mt-6 grid gap-4 @min-[560px]:grid-cols-2 @min-[900px]:grid-cols-3">
          {s.whyPoints.map((p) => (
            <li key={p.title} className="rounded-[18px] border border-white/20 bg-white/10 px-5 py-4">
              <p className="flex items-center gap-2 font-display font-bold">
                <CheckCircle2 size={16} className="shrink-0 text-[#cfe3ec]" /> {p.title}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/85">{p.text}</p>
            </li>
          ))}
        </ul>
      </Band>

      <Band>
        <h2 className={H2}>{s.faqTitle}</h2>
        <div className="mt-6 space-y-3">
          {s.faq.map((f) => (
            <details key={f.q} className={`group ${CARD} px-5 py-4`}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-semibold leading-snug">
                {f.q}
                <ChevronDown size={16} className="shrink-0 text-[#4a6a78] transition group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-[1.75] text-[#57534c]">{f.a}</p>
            </details>
          ))}
        </div>
      </Band>

      <Band id="contact-cimco" className="bg-[#cfe3ec]">
        <h2 className={H2}>{s.ctaTitle}</h2>
        <p className={P}>{s.ctaText}</p>
        <form className="mt-5 grid max-w-2xl gap-3 @min-[560px]:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
          <input className="rounded-2xl border border-[#1a1a18]/10 bg-white px-4 py-3 text-sm" placeholder="Nom" />
          <input className="rounded-2xl border border-[#1a1a18]/10 bg-white px-4 py-3 text-sm" placeholder="Téléphone" />
          <input className="rounded-2xl border border-[#1a1a18]/10 bg-white px-4 py-3 text-sm @min-[560px]:col-span-2" placeholder="E-mail" />
          <button className={`justify-center @min-[560px]:col-span-2 ${BTN}`}>Demander à être rappelé</button>
        </form>
        <p className="mt-3 text-xs text-[#57534c]">{s.reassurance}</p>
      </Band>
    </div>
  )
}
