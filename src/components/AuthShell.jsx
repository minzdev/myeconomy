export function RaBadge({ size = 'md' }) {
  const cls = size === 'lg' ? 'w-14 h-14 text-2xl rounded-2xl' : 'w-9 h-9 text-base rounded-xl'
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center font-display bg-black text-brutal-yellow border-2 border-black shadow-brutal ${cls}`}
    >
      ME
    </span>
  )
}

export function friendlyAuthError(e) {
  const code = e?.code || ''
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found'))
    return 'Email atau password salah. Coba lagi.'
  if (code.includes('email-already-in-use')) return 'Email sudah terdaftar. Silakan masuk.'
  if (code.includes('weak-password')) return 'Password minimal 6 karakter.'
  if (code.includes('invalid-email')) return 'Format email tidak valid.'
  if (code.includes('too-many-requests')) return 'Terlalu banyak percobaan. Tunggu sebentar.'
  if (code.includes('network-request-failed')) return 'Jaringan bermasalah. Periksa koneksi.'
  return e?.message || 'Terjadi kesalahan. Coba lagi.'
}

export default function AuthShell({ title, subtitle, color = 'bg-brutal-yellow', children, footer }) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-3 py-8">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-4">
          <RaBadge size="lg" />
          <p className="font-display text-lg mt-2 tracking-tight">
            MY<span className="bg-black text-white px-1 ml-0.5">ECONOMY</span>
          </p>
          <p className="text-xs font-bold text-neutral-600">Catat uang, capai tujuan.</p>
        </div>

        <div className={`card-brutal p-5 sm:p-6 ${color}`}>
          <h1 className="font-display text-2xl">{title}</h1>
          {subtitle && <p className="font-bold text-sm mt-1">{subtitle}</p>}
          <div className="mt-4">{children}</div>
        </div>

        {footer && (
          <div className="card-brutal p-4 mt-3 bg-white text-center text-sm font-bold">{footer}</div>
        )}

        <p className="text-center text-[11px] font-bold text-neutral-500 mt-3">
          Data tersimpan aman per akun.
        </p>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { BrutalInput } from './ui.jsx'

export function PasswordInput({ value, onChange, placeholder = 'Password', ...props }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <BrutalInput
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={props.autoComplete || 'current-password'}
        className="min-h-[48px] pr-12"
        required
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
        className="absolute right-2 top-1/2 -translate-y-1/2 font-bold text-xs border-2 border-black rounded-lg px-2 py-1 bg-white"
      >
        {show ? '🙈' : '👁️'}
      </button>
    </div>
  )
}
