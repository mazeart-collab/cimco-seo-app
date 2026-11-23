import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Monitor, Smartphone, Maximize2, X } from 'lucide-react'
import Preview from './Preview'

function DeviceSwitch({ device, onChange }) {
  return (
    <div className="flex gap-0.5 rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Taille de l'aperçu">
      {[
        ['desktop', 'Desktop', Monitor],
        ['mobile', 'Mobile', Smartphone],
      ].map(([id, label, Icon]) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          aria-pressed={device === id}
          className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${device === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
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

function FullScreen({ name, s, device, onDevice, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/80" role="dialog" aria-modal="true" aria-label={`Aperçu plein écran : ${name}`}>
      <div className="flex shrink-0 items-center justify-between gap-3 bg-white px-4 py-2.5 shadow">
        <p className="truncate text-sm font-semibold">{name}</p>
        <DeviceSwitch device={device} onChange={onDevice} />
        <button onClick={onClose} className="flex items-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">
          <X size={14} /> Fermer
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
        <div className={device === 'desktop' ? 'mx-auto max-w-5xl' : ''}>
          <Frame device={device} s={s} />
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function PreviewPane({ name, s }) {
  const [device, setDevice] = useState('desktop')
  const [full, setFull] = useState(false)
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Aperçu de la page</p>
        <div className="flex items-center gap-2">
          <DeviceSwitch device={device} onChange={setDevice} />
          <button onClick={() => setFull(true)} className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
            <Maximize2 size={13} /> Plein écran
          </button>
        </div>
      </div>
      <Frame device={device} s={s} />
      {full && <FullScreen name={name} s={s} device={device} onDevice={setDevice} onClose={() => setFull(false)} />}
    </div>
  )
}
