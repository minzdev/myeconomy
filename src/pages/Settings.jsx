import { useState } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { useAuth } from '../contexts/AuthContext.jsx'
import { listCategories, addCategory, removeCategory } from '../lib/categories.js'
import { BrutalButton, BrutalCard, BrutalInput, BrutalSelect, Loading } from '../components/ui.jsx'
import { friendlyDbError } from '../lib/errors.js'

const CATEGORY_ICONS = ['🍔', '☕', '🛵', '🚗', '🚂', '🛍️', '🏷️', '🧾', '🏠', '💡', '🎮', '🎬', '💊', '📚', '💰', '🎁', '🏪', '💵', '✈️', '📦']
const DEFAULT_ICON = { expense: '🍔', income: '💰', both: '📦' }
const TG_BOT = import.meta.env.VITE_TELEGRAM_BOT || ''

export default function Settings() {
  const { user } = useAuth()
  const uid = user?.uid || 'demo'
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [type, setType] = useState('expense')
  const [icon, setIcon] = useState(DEFAULT_ICON.expense)
  const [linkCode, setLinkCode] = useState('')
  const [tgErr, setTgErr] = useState('')
  const [tgBusy, setTgBusy] = useState(false)
  const [err, setErr] = useState('')
  const { data: cats = [], isLoading } = useQuery(['cats', uid], () => listCategories(uid))

  if (isLoading) return <Loading />

  return (
    <div className="space-y-4">
      <BrutalCard color="bg-white">
        <h2 className="font-display text-2xl">PROFIL</h2>
        <p className="text-sm font-bold mt-1 break-all">{user?.email} {user?.uid === 'demo' && '(Mode Demo - isi Firebase env untuk real)'}</p>
      </BrutalCard>

      <BrutalCard color="bg-brutal-blue">
        <h2 className="font-display text-xl">BOT TELEGRAM</h2>
        <p className="text-xs sm:text-sm font-bold mt-1">
          Catat transaksi lewat chat. Contoh: <code>keluar 50rb makan bca</code>
        </p>
        <ol className="text-xs sm:text-sm font-bold mt-2 space-y-1 list-decimal list-inside">
          <li>Klik <b>Buat kode</b> (berlaku 15 menit)</li>
          <li>Buka bot{TG_BOT ? <> <a className="underline underline-offset-2" href={`https://t.me/${TG_BOT}`} target="_blank" rel="noreferrer">@{TG_BOT}</a></> : ' Telegram kamu'} lalu kirim <code>/start KODE</code> (atau tempel kodenya saja)</li>
          <li>Kirim transaksi bebas, batalkan dengan <code>/batal</code></li>
        </ol>
        {linkCode && (
          <p className="mt-2 text-center font-display text-3xl tracking-widest border-2 border-black rounded-lg bg-white py-2">
            {linkCode}
          </p>
        )}
        {tgErr && <p role="alert" className="text-sm font-bold bg-red-300 border-2 border-black rounded-lg p-2 mt-2">{tgErr}</p>}
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <BrutalButton
            color="bg-black text-white flex-1"
            className="min-h-[44px] text-sm"
            disabled={tgBusy}
            onClick={async () => {
              setTgErr('')
              setTgBusy(true)
              try {
                if (!user?.getIdToken) throw new Error('Butuh backend + login Firebase (bukan mode demo).')
                const token = await user.getIdToken()
                const r = await fetch('/api/telegram/link-code', {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}` },
                })
                const j = await r.json().catch(() => ({}))
                if (!r.ok) throw new Error(j.error || 'Backend tidak merespons. Pastikan server jalan.')
                setLinkCode(j.code)
              } catch (e2) {
                setTgErr(e2.message)
              } finally {
                setTgBusy(false)
              }
            }}
          >
            {tgBusy ? 'Membuat...' : 'Buat kode'}
          </BrutalButton>
          <BrutalButton
            color="bg-white flex-1"
            className="min-h-[44px] text-sm"
            onClick={async () => {
              setTgErr('')
              try {
                if (!user?.getIdToken) throw new Error('Butuh backend + login Firebase (bukan mode demo).')
                const token = await user.getIdToken()
                const r = await fetch('/api/telegram/link', {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${token}` },
                })
                const j = await r.json().catch(() => ({}))
                if (!r.ok) throw new Error(j.error || 'Backend tidak merespons.')
                setLinkCode('')
              } catch (e2) {
                setTgErr(e2.message)
              }
            }}
          >
            Putuskan tautan
          </BrutalButton>
        </div>
      </BrutalCard>

      <BrutalCard color="bg-brutal-yellow">
        <h2 className="font-display text-xl">TAMBAH KATEGORI</h2>
        <form
          className="space-y-2 mt-3"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!name.trim()) return
            setErr('')
            try {
              await addCategory(uid, { name: name.trim(), type, icon, color: '#FFF' })
              setName('')
              qc.invalidateQueries(['cats', uid])
            } catch (e2) {
              setErr(friendlyDbError(e2))
            }
          }}
        >
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Pilih ikon">
            {CATEGORY_ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                role="radio"
                aria-checked={icon === ic}
                title={ic}
                onClick={() => setIcon(ic)}
                className={`w-11 h-11 text-xl rounded-lg border-2 border-black transition-all ${
                  icon === ic ? 'bg-black scale-110' : 'bg-white'
                }`}
              >
                {ic}
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <BrutalInput placeholder="Nama kategori" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} className="flex-1 min-h-[44px]" />
            <BrutalSelect
              value={type}
              onChange={(e) => { setType(e.target.value); setIcon(DEFAULT_ICON[e.target.value]) }}
              className="sm:w-44"
              aria-label="Tipe kategori"
            >
              <option value="expense">Pengeluaran</option>
              <option value="income">Pemasukan</option>
              <option value="both">Keduanya</option>
            </BrutalSelect>
            <BrutalButton color="bg-black text-white" type="submit" className="min-h-[44px]">Tambah</BrutalButton>
          </div>
        </form>
        {err && <p role="alert" className="text-sm font-bold bg-red-300 border-2 border-black rounded-lg p-2 mt-2">{err}</p>}
      </BrutalCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {cats.map((c) => (
          <div key={c.id} className="card-brutal p-3 bg-white flex justify-between items-center">
            <span className="font-bold text-sm">{c.icon} {c.name} ({c.type})</span>
            <button
              className="btn-brutal bg-red-300 rounded text-xs px-2 py-1"
              onClick={async () => { await removeCategory(uid, c.id); qc.invalidateQueries(['cats', uid]) }}
            >
              Hapus
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
