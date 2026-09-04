export function BrutalButton({ color = 'bg-white', className = '', ...props }) {
  return (
    <button
      className={`btn-brutal rounded-lg ${color} ${className} disabled:opacity-50 disabled:pointer-events-none`}
      {...props}
    />
  )
}

export function BrutalCard({ color = 'bg-white', className = '', ...props }) {
  return <div className={`card-brutal p-4 sm:p-5 ${color} ${className}`} {...props} />
}

export function BrutalInput({ className = '', ...props }) {
  return <input className={`input-brutal ${className}`} {...props} />
}

// Input angka Rupiah: ketik digit, tampil otomatis bertitik (1.000.000)
export function CurrencyInput({ value, onChange, placeholder = '0', className = '', ...props }) {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 15).replace(/^0+(?=\d)/, '')
  const display = digits ? Number(digits).toLocaleString('id-ID') : ''
  return (
    <span className="relative block">
      <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-sm">
        Rp
      </span>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 15))}
        className={`input-brutal min-h-[48px] pl-11 text-base font-bold ${className}`}
        {...props}
      />
    </span>
  )
}

export function BrutalSelect({ className = '', children, ...props }) {
  return (
    <span className={`relative block min-w-0 ${className}`}>
      <select
        {...props}
        className="input-brutal block w-full appearance-none pr-10 min-h-[44px] font-bold cursor-pointer bg-white"
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </span>
  )
}

export function EmptyState({ title = 'Belum ada data', desc = '' }) {
  return (
    <div className="card-brutal p-6 text-center bg-white">
      <p className="text-3xl" aria-hidden="true">📭</p>
      <p className="font-display text-base sm:text-lg mt-2">{title}</p>
      {desc && <p className="text-xs sm:text-sm mt-1 font-bold text-neutral-600">{desc}</p>}
    </div>
  )
}

export function Loading({ text = 'Memuat...' }) {
  return (
    <div className="card-brutal p-6 bg-brutal-yellow font-bold flex items-center gap-3" role="status">
      <span className="inline-block w-5 h-5 border-[3px] border-black border-t-transparent rounded-full animate-spin" aria-hidden="true" />
      {text}
    </div>
  )
}

export function ConfirmModal({ open, title, desc = '', onCancel, onConfirm, confirmText = 'Hapus' }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-3 sm:p-4 z-50"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="card-brutal p-5 bg-white w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-base sm:text-lg leading-snug">{title}</h3>
        {desc && <p className="text-xs sm:text-sm font-bold text-neutral-600 mt-1">{desc}</p>}
        <div className="flex flex-col-reverse sm:flex-row gap-2 mt-4">
          <button className="btn-brutal bg-white rounded-lg flex-1 min-h-[44px] text-sm" onClick={onCancel}>
            Batal
          </button>
          <button className="btn-brutal bg-red-400 rounded-lg flex-1 min-h-[44px] text-sm" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
