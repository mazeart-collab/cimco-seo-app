import { useState } from 'react'
import { Monitor, Smartphone, Maximize2 } from 'lucide-react'
import Preview from './Preview'

export function DeviceSwitch({ device, onChange, dark = false }) {
  return (
    <div className={`flex gap-0.5 rounded-lg p-0.5 ${dark ? 'bg-white/10' : 'bg-slate-100'}`} role="group" aria-label="Taille de l'aperçu">
      {[
        ['desktop', 'Desktop', Monitor],
        ['mobile', 'Mobile', Smartphone],
      ].map(([id, label, Icon]) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          aria-pressed={device === id}
          className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${
            device === id ? 'bg-white text-slate-900 shadow-sm' : dark ? 'text-slate-300 hover:text-white' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Icon size={13} /> {label}
        </button>
      ))}
    </div>
  )
}

// Même composant Preview dans les deux modes : le mobile est un cadre de 390 px (les mises en page réagissent à la largeur du cadre)
function Frame({ device, s }) {
  if (device === 'mobile') {
    return (
      <div className="mx-auto w-[390px] max-w-full rounded-[28px] border-[6px] border-slate-300 bg-white shadow-sm" data-testid="mobile-frame">
        <div className="overflow-hidden rounded-[20px]">
          <Preview s={s} />
        </div>
      </div>
    )
  }
  return <Preview s={s} />
}

export default function PreviewPane({ name, s }) {
  const [device, setDevice] = useState('desktop')
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Aperçu de la page</p>
        <div className="flex items-center gap-2">
          <DeviceSwitch device={device} onChange={setDevice} />
          <button onClick={() => window.open(`${location.pathname}#/apercu/${encodeURIComponent(name)}?device=${device}`, '_blank', 'noopener')} className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
            <Maximize2 size={13} /> Plein écran
          </button>
        </div>
      </div>
      <Frame device={device} s={s} />
    </div>
  )
}
