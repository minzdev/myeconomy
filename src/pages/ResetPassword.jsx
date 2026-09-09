import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth'
import { auth } from '../lib/firebase.js'
import { BrutalButton } from '../components/ui.jsx'
import AuthShell, { PasswordInput, friendlyAuthError } from '../components/AuthShell.jsx'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const oobCode = params.get('oobCode') || ''
  const [status, setStatus] = useState(!oobCode ? 'invalid' : 'verifying')
  const [email, setEmail] = useState('')
  const [pass1, setPass1] = useState('')
  const [pass2, setPass2] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!oobCode) return
    if (!auth) {
      setStatus('invalid')
      return
    }
    verifyPasswordResetCode(auth, oobCode)
      .then((em) => {
        setEmail(em)
        setStatus('form')
      })
      .catch(() => setStatus('invalid'))
  }, [oobCode])

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (pass1.length < 6) return setErr('Password minimal 6 karakter.')
    if (pass1 !== pass2) return setErr('Konfirmasi password tidak sama.')
    setBusy(true)
    try {
      await confirmPasswordReset(auth, oobCode, pass1)
      setStatus('done')
    } catch (e2) {
      const code = e2?.code || ''
      if (code.includes('expired-action-code') || code.includes('invalid-action-code')) {
        setStatus('invalid')
      } else {
        setErr(friendlyAuthError(e2))
      }
    } finally {
      setBusy(false)
    }
  }

  if (status === 'verifying') {
    return (
      <AuthShell title="Memeriksa link..." subtitle="Tunggu sebentar." color="bg-brutal-yellow">
        <p className="text-sm font-bold animate-pulse">Memvalidasi kode reset...</p>
      </AuthShell>
    )
  }

  if (status === 'invalid') {
    return (
      <AuthShell title="Link tidak valid" subtitle="Kode reset salah atau kadaluarsa." color="bg-brutal-pink">
        <p className="text-sm font-bold bg-white border-2 border-black rounded-lg p-3">
          Link reset hanya berlaku 1 jam dan sekali pakai. Minta link baru lewat halaman login → Lupa password?
        </p>
        <Link to="/login">
          <BrutalButton color="bg-black text-white w-full" className="min-h-[48px] mt-3">
            KE HALAMAN MASUK
          </BrutalButton>
        </Link>
      </AuthShell>
    )
  }

  if (status === 'done') {
    return (
      <AuthShell title="Berhasil!" subtitle="Password kamu sudah diganti." color="bg-brutal-green">
        <p className="text-sm font-bold bg-white border-2 border-black rounded-lg p-3">
          Silakan masuk dengan password baru{email ? ` untuk ${email}` : ''}.
        </p>
        <Link to="/login">
          <BrutalButton color="bg-black text-white w-full" className="min-h-[48px] mt-3">
            MASUK SEKARANG
          </BrutalButton>
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Password Baru"
      subtitle={email ? `Untuk akun ${email}` : 'Buat password yang kuat.'}
      color="bg-brutal-yellow"
      footer={<>Ingat password lama? <Link to="/login" className="underline underline-offset-2">Masuk</Link></>}
    >
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor="rp-pass1" className="text-xs font-bold">PASSWORD BARU</label>
          <div className="mt-1">
            <PasswordInput
              id="rp-pass1"
              placeholder="Minimal 6 karakter"
              value={pass1}
              onChange={(e) => setPass1(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>
        <div>
          <label htmlFor="rp-pass2" className="text-xs font-bold">KONFIRMASI PASSWORD</label>
          <div className="mt-1">
            <PasswordInput
              id="rp-pass2"
              placeholder="Ulangi password baru"
              value={pass2}
              onChange={(e) => setPass2(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>

        {err && <p role="alert" className="text-sm font-bold bg-red-300 border-2 border-black rounded-lg p-2">{err}</p>}

        <BrutalButton color="bg-black text-white w-full" className="min-h-[48px]" disabled={busy}>
          {busy ? 'Menyimpan...' : 'SIMPAN PASSWORD BARU'}
        </BrutalButton>
      </form>
    </AuthShell>
  )
}
