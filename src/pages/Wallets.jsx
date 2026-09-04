import { useState } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { useAuth } from '../contexts/AuthContext.jsx'
import { listWallets, addWallet, updateWallet, removeWallet, calcWalletBalances, walletTypeLabel, WALLET_TYPES } from '../lib/wallets.js'
import { listTransactions } from '../lib/transactions.js'
import { formatIDR } from '../lib/currency.js'
import { friendlyDbError } from '../lib/errors.js'
import { BrutalButton, BrutalCard, BrutalInput, BrutalSelect, ConfirmModal, EmptyState, Loading } from '../components/ui.jsx'

export default function Wallets() {
  const { user } = useAuth()
  const uid = user?.uid || 'demo'
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [type, setType] = useState('cash')
  const [initialBalance, setInitialBalance] = useState('')
  const [editing, setEditing] = useState(null)
  const [delId, setDelId] = useState(null)
  const [err, setErr] = useState('')

  const { data: wallets = [], isLoading } = useQuery(['wallets', uid], () => listWallets(uid))
  const { data: allTx = [] } = useQuery(['tx', uid], () => listTransactions(uid))
  const refresh = () => qc.invalidateQueries(['wallets', uid])

  if (isLoading) return <Loading />
  const balances = calcWalletBalances(wallets, allTx)
  const total = Object.values(balances).reduce((a, b) => a + b, 0)
  const usageCount = (id) => allTx.filter((t) => (t.walletId || t.wallet) === id).length
  const delTarget = wallets.find((w) => w.id === delId)

  const handleAdd = async (e) => {
    e.preventDefault()
    setErr('')
    try {
      await addWallet(uid, { name, type, initialBalance })
      setName('')
      setInitialBalance('')
      refresh()
    } catch (e2) {
      setErr(friendlyDbError(e2))
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setErr('')
    try {
      await updateWallet(uid, editing.id, editing)
      setEditing(null)
      refresh()
    } catch (e2) {
      setErr(friendlyDbError(e2))
    }
  }

  return (
    <div className="space-y-4">
      <BrutalCard color="bg-brutal-green" className="p-4 sm:p-5">
        <p className="font-bold text-xs sm:text-sm">TOTAL SEMUA DOMPET</p>
        <h1 className="font-display text-3xl sm:text-4xl break-words">{formatIDR(total)}</h1>
        <p className="text-xs sm:text-sm mt-1 font-bold">{wallets.length} dompet • saldo awal + mutasi transaksi</p>
      </BrutalCard>

      <BrutalCard className="p-4 sm:p-5">
        <h2 className="font-display text-lg sm:text-xl">+ DOMPET BARU</h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-4 gap-2 mt-3">
          <BrutalInput
            placeholder="Nama — cth: BCA, Dana"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            className="min-h-[44px]"
            required
          />
          <BrutalSelect value={type} onChange={(e) => setType(e.target.value)} className="min-h-[44px]" aria-label="Tipe dompet">
            {WALLET_TYPES.map((t) => (
              <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
            ))}
          </BrutalSelect>
          <BrutalInput
            type="number"
            placeholder="Saldo awal (opsional)"
            value={initialBalance}
            onChange={(e) => setInitialBalance(e.target.value)}
            className="min-h-[44px]"
          />
          <BrutalButton color="bg-black text-white" type="submit" className="min-h-[44px]">
            Tambah
          </BrutalButton>
        </form>
        {err && <p role="alert" className="text-sm font-bold bg-red-300 border-2 border-black rounded-lg p-2 mt-2">{err}</p>}
      </BrutalCard>

      {wallets.length === 0 ? (
        <EmptyState title="Belum ada dompet" desc="Tambah dompet pertama di atas" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {wallets.map((w) => (
            <BrutalCard key={w.id} className="p-4" color="bg-white">
              {editing?.id === w.id ? (
                <form onSubmit={handleUpdate} className="space-y-2">
                  <BrutalInput value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} maxLength={30} className="min-h-[44px]" required />
                  <div className="grid grid-cols-2 gap-2">
                    <BrutalSelect value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })} className="min-h-[44px]">
                      {WALLET_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </BrutalSelect>
                    <BrutalInput
                      type="number"
                      value={editing.initialBalance ?? 0}
                      onChange={(e) => setEditing({ ...editing, initialBalance: e.target.value })}
                      className="min-h-[44px]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <BrutalButton type="button" color="bg-white flex-1" onClick={() => setEditing(null)} className="min-h-[44px] text-sm">
                      Batal
                    </BrutalButton>
                    <BrutalButton color="bg-brutal-yellow flex-1" type="submit" className="min-h-[44px] text-sm">
                      Simpan
                    </BrutalButton>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-display text-base sm:text-lg truncate">{w.icon} {w.name}</p>
                      <span className="inline-block text-[11px] font-bold border-2 border-black rounded-full px-2 py-0.5 mt-1 bg-brutal-cream">
                        {walletTypeLabel(w.type)}
                      </span>
                    </div>
                    <p className="font-display text-base sm:text-lg text-right break-words">{formatIDR(balances[w.id] || 0)}</p>
                  </div>
                  <p className="text-xs mt-2 font-bold text-neutral-600">
                    Saldo awal {formatIDR(w.initialBalance || 0)} • {usageCount(w.id)} transaksi
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => setEditing(w)} className="btn-brutal bg-brutal-blue rounded-lg text-xs px-3 py-2 min-h-[40px] flex-1">
                      Edit
                    </button>
                    <button onClick={() => setDelId(w.id)} className="btn-brutal bg-red-300 rounded-lg text-xs px-3 py-2 min-h-[40px] flex-1">
                      Hapus
                    </button>
                  </div>
                </>
              )}
            </BrutalCard>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!delId}
        title={delTarget && usageCount(delId) > 0 ? `Hapus ${delTarget.name}? ${usageCount(delId)} transaksi memakai dompet ini.` : 'Hapus dompet ini?'}
        confirmText="Hapus"
        onCancel={() => setDelId(null)}
        onConfirm={async () => {
          await removeWallet(uid, delId)
          setDelId(null)
          refresh()
        }}
      />
    </div>
  )
}
