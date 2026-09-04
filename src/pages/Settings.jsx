import { useState } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { useAuth } from '../contexts/AuthContext.jsx'
import { listCategories, addCategory, removeCategory } from '../lib/categories.js'
import { BrutalButton, BrutalCard, BrutalInput, BrutalSelect, Loading } from '../components/ui.jsx'
import { friendlyDbError } from '../lib/errors.js'

const CATEGORY_ICONS = ['🍔', '☕', '🛵', '🚗', '🛍️', '🧾', '🏠', '💡', '🎮', '🎬', '💊', '📚', '💰', '🎁', '🏪', '💵', '✈️', '📦']
const DEFAULT_ICON = { expense: '🍔', income: '💰', both: '📦' }

export default function Settings() {
  const { user } = useAuth()
  const uid = user?.uid || 'demo'
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [type, setType] = useState('expense')
  const [icon, setIcon] = useState(DEFAULT_ICON.expense)
  const [err, setErr] = useState('')
  const { data: cats = [], isLoading } = useQuery(['cats', uid], () => listCategories(uid))

  if (isLoading) return <Loading />

  return (
    <div className="space-y-4">
      <BrutalCard color="bg-white">
        <h2 className="font-display text-2xl">PROFIL</h2>
        <p className="text-sm font-bold mt-1 break-all">{user?.email} {user?.uid === 'demo' && '(Mode Demo - isi Firebase env untuk real)'}</p>
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
