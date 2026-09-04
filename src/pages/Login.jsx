import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { BrutalButton, BrutalInput } from '../components/ui.jsx'
import AuthShell, { PasswordInput, friendlyAuthError } from '../components/AuthShell.jsx'

export default function Login() {
  const { login, reset } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setInfo('')
    setBusy(true)
    try {
      await login(email.trim(), pass)
      nav('/')
    } catch (e2) {
      setErr(friendlyAuthError(e2))
    } finally {
      setBusy(false)
    }
  }

  const forgot = async () => {
    setErr('')
    setInfo('')
    if (!email.trim()) return setErr('Isi email dulu, lalu klik Lupa password.')
    try {
      await reset(email.trim())
      setInfo('Link reset terkirim ke email (cek inbox/spam).')
    } catch (e2) {
      setErr(friendlyAuthError(e2))
    }
  }

  return (
    <AuthShell
      title="Masuk"
      subtitle="Senang bertemu lagi. Yuk lanjut catat."
      color="bg-brutal-yellow"
      footer={<>Belum punya akun? <Link to="/register" className="underline underline-offset-2">Daftar gratis</Link></>}
    >
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor="login-email" className="text-xs font-bold">EMAIL</label>
          <BrutalInput
            id="login-email"
            type="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="min-h-[48px] mt-1"
            required
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="login-pass" className="text-xs font-bold">PASSWORD</label>
            <button type="button" onClick={forgot} className="text-xs font-bold underline underline-offset-2">
              Lupa password?
            </button>
          </div>
          <div className="mt-1">
            <PasswordInput id="login-pass" value={pass} onChange={(e) => setPass(e.target.value)} />
          </div>
        </div>

        {err && <p role="alert" className="text-sm font-bold bg-red-300 border-2 border-black rounded-lg p-2">{err}</p>}
        {info && <p role="status" className="text-sm font-bold bg-green-300 border-2 border-black rounded-lg p-2">{info}</p>}

        <BrutalButton color="bg-black text-white w-full" className="min-h-[48px]" disabled={busy}>
          {busy ? 'Memeriksa...' : 'MASUK'}
        </BrutalButton>
      </form>
    </AuthShell>
  )
}
