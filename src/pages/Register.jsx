import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { BrutalButton, BrutalInput } from '../components/ui.jsx'
import AuthShell, { PasswordInput, friendlyAuthError } from '../components/AuthShell.jsx'

export default function Register() {
  const { register } = useAuth()
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (pass.length < 6) return setErr('Password minimal 6 karakter.')
    setBusy(true)
    try {
      await register(name.trim(), email.trim(), pass)
      nav('/')
    } catch (e2) {
      setErr(friendlyAuthError(e2))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Daftar"
      subtitle="Gratis, 30 detik langsung bisa catat."
      color="bg-brutal-blue"
      footer={<>Sudah punya akun? <Link to="/login" className="underline underline-offset-2">Masuk</Link></>}
    >
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor="reg-name" className="text-xs font-bold">NAMA</label>
          <BrutalInput
            id="reg-name"
            placeholder="Nama kamu"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            maxLength={40}
            className="min-h-[48px] mt-1"
            required
          />
        </div>
        <div>
          <label htmlFor="reg-email" className="text-xs font-bold">EMAIL</label>
          <BrutalInput
            id="reg-email"
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
          <label htmlFor="reg-pass" className="text-xs font-bold">PASSWORD</label>
          <div className="mt-1">
            <PasswordInput id="reg-pass" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Minimal 6 karakter" autoComplete="new-password" />
          </div>
        </div>

        {err && <p role="alert" className="text-sm font-bold bg-red-300 border-2 border-black rounded-lg p-2">{err}</p>}

        <BrutalButton color="bg-black text-white w-full" className="min-h-[48px]" disabled={busy}>
          {busy ? 'Membuat akun...' : 'BUAT AKUN'}
        </BrutalButton>
      </form>
    </AuthShell>
  )
}
