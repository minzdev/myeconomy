import { useState } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { useAuth } from '../contexts/AuthContext.jsx'
import { listCategories, addCategory, removeCategory } from '../lib/categories.js'
import { BrutalButton, BrutalCard, BrutalInput, BrutalSelect, Loading } from '../components/ui.jsx'

export default function Settings() {
  const { user } = useAuth()
  const uid = user?.uid || 'demo'
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [type, setType] = useState('expense')
  const { data: cats = [], isLoading } = useQuery(['cats', uid], () => listCategories(uid))

  if (isLoading) return <Loading />

  return (
    <div className="space-y-4">
      <BrutalCard color="bg-white">
        <h2 className="font-display text-2xl">PROFIL</h2>
        <p className="text-sm font-bold mt-1">{user?.email} {user?.uid === 'demo' && '(Mode Demo - isi Firebase env untuk real)'}</p>
      </BrutalCard>

      <BrutalCard color="bg-brutal-yellow">
        <h2 className="font-display text-xl">TAMBAH KATEGORI</h2>
        <form
          className="flex flex-col sm:flex-row gap-2 mt-2"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!name) return
            await addCategory(uid, { name, type, icon: '📦', color: '#FFF' })
            setName('')
            qc.invalidateQueries(['cats', uid])
          }}
        >
          <BrutalInput placeholder="Nama kategori" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
          <BrutalSelect value={type} onChange={(e) => setType(e.target.value)}>
            <option value="expense">Pengeluaran</option>
            <option value="income">Pemasukan</option>
            <option value="both">Keduanya</option>
          </BrutalSelect>
          <BrutalButton color="bg-black text-white" type="submit">Tambah</BrutalButton>
        </form>
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
