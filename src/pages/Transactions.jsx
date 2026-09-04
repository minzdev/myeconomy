import { useState } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { useAuth } from '../contexts/AuthContext.jsx'
import { listTransactions, filterTx, resolveDateRange, addTransaction, updateTransaction, removeTransaction } from '../lib/transactions.js'
import { listCategories } from '../lib/categories.js'
import { listWallets, walletName } from '../lib/wallets.js'
import { formatIDR, monthKey } from '../lib/currency.js'
import { BrutalButton, BrutalCard, BrutalInput, BrutalSelect, ConfirmModal, EmptyState, Loading } from '../components/ui.jsx'
import { friendlyDbError } from '../lib/errors.js'
import TransactionForm from '../components/TransactionForm.jsx'

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

const DATE_PRESETS = [
  { id: 'today', label: 'Hari ini' },
  { id: 'yesterday', label: 'Kemarin' },
  { id: 'week', label: '7 Hari' },
  { id: 'month', label: 'Bulan ini' },
  { id: 'custom', label: 'Custom' },
  { id: 'all', label: 'Semua' },
]

export default function Transactions() {
  const { user } = useAuth()
  const uid = user?.uid || 'demo'
  const qc = useQueryClient()
  const [datePreset, setDatePreset] = useState('month')
  const [month, setMonth] = useState(monthKey())
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [type, setType] = useState('all')
  const [cat, setCat] = useState('all')
  const [wallet, setWallet] = useState('all')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  const [delId, setDelId] = useState(null)
  const [submitErr, setSubmitErr] = useState('')

  const { data: all = [], isLoading } = useQuery(['tx', uid], () => listTransactions(uid))
  const { data: cats = [] } = useQuery(['cats', uid], () => listCategories(uid))
  const { data: wallets = [] } = useQuery(['wallets', uid], () => listWallets(uid))
  const refresh = () => qc.invalidateQueries(['tx', uid])

  if (isLoading) return <Loading />
  const range = resolveDateRange(datePreset, { month, start, end })
  const list = filterTx(all, {
    startDate: range?.start,
    endDate: range?.end,
    type, categoryId: cat, walletId: wallet, q,
  })
  const totalFiltered = list.reduce((a, t) => a + (t.type === 'income' ? Number(t.amount || 0) : -Number(t.amount || 0)), 0)
  const catName = (id) => cats.find((c) => c.id === id)?.name || id
  const rangeLabel = !range ? 'Semua tanggal' : range.start === range.end ? fmtDate(range.start) : `${fmtDate(range.start)} – ${fmtDate(range.end)}`

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
        <BrutalButton color="bg-brutal-yellow w-full sm:w-auto" onClick={() => setAdding(true)} className="min-h-[48px] text-sm">
          + Tambah
        </BrutalButton>
        <BrutalButton
          color="bg-white w-full sm:w-auto"
          className="min-h-[48px] text-sm"
          onClick={async () => {
            const { exportTransactionsPDF } = await import('../lib/pdf.js')
            const stamp = range ? `${range.start}_${range.end}` : 'semua'
            exportTransactionsPDF({
              list,
              fileStamp: stamp,
              periodLabel: rangeLabel,
              catName,
              walletLabel: (id) => walletName(wallets, id),
            })
          }}
        >
          ⬇ Export PDF
        </BrutalButton>
      </div>

      {(adding || editing) && (
        <BrutalCard color="bg-white" className="p-4 sm:p-5">
          {submitErr && <p role="alert" className="text-sm font-bold bg-red-300 border-2 border-black rounded-lg p-2 mb-3">{submitErr}</p>}
          <TransactionForm
            key={editing ? `edit-${editing.id}` : 'new'}
            categories={cats}
            wallets={wallets}
            initial={editing || {}}
            onCancel={() => { setAdding(false); setEditing(null) }}
            onSubmit={async (p) => {
              setSubmitErr('')
              try {
                if (editing) await updateTransaction(uid, editing.id, p)
                else await addTransaction(uid, p)
                setAdding(false); setEditing(null); refresh()
              } catch (e2) {
                setSubmitErr(friendlyDbError(e2))
              }
            }}
          />
        </BrutalCard>
      )}

      <BrutalCard className="p-4 sm:p-5">
        <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-1.5" role="tablist" aria-label="Filter tanggal">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={datePreset === p.id}
              onClick={() => setDatePreset(p.id)}
              className={`min-h-[44px] px-2 text-xs font-bold border-2 border-black rounded-full transition-all sm:flex-1 sm:whitespace-nowrap sm:px-3 ${
                datePreset === p.id ? 'bg-black text-white' : 'bg-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {datePreset === 'month' && (
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input-brutal bg-white font-bold min-h-[44px] mt-2" aria-label="Pilih bulan" />
        )}
        {datePreset === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            <label className="text-xs font-bold">Dari
              <input type="date" value={start} max={end || undefined} onChange={(e) => setStart(e.target.value)} className="input-brutal bg-white font-bold min-h-[44px] mt-1" aria-label="Tanggal mulai" />
            </label>
            <label className="text-xs font-bold">Sampai
              <input type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} className="input-brutal bg-white font-bold min-h-[44px] mt-1" aria-label="Tanggal akhir" />
            </label>
          </div>
        )}

        <p className="text-xs font-bold mt-2">📅 {rangeLabel} • {list.length} transaksi • {formatIDR(totalFiltered)}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-2">
          <BrutalSelect value={type} onChange={(e) => setType(e.target.value)} className="min-h-[44px]" aria-label="Tipe">
            <option value="all">Semua tipe</option>
            <option value="income">Masuk</option>
            <option value="expense">Keluar</option>
          </BrutalSelect>
          <BrutalSelect value={cat} onChange={(e) => setCat(e.target.value)} className="min-h-[44px]" aria-label="Kategori">
            <option value="all">Semua kategori</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </BrutalSelect>
          <BrutalSelect value={wallet} onChange={(e) => setWallet(e.target.value)} className="min-h-[44px]" aria-label="Dompet">
            <option value="all">Semua dompet</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </BrutalSelect>
          <BrutalInput placeholder="🔍 Cari..." value={q} onChange={(e) => setQ(e.target.value)} className="min-h-[48px] sm:col-span-2 lg:col-span-1" />
        </div>
      </BrutalCard>

      {list.length === 0 ? (
        <EmptyState title="Tidak ada transaksi" desc="Ubah filter atau tambah baru" />
      ) : (
        <div className="space-y-2">
          {list.map((t) => (
            <div key={t.id} className="card-brutal p-3 bg-white flex justify-between items-center gap-2">
              <div className="min-w-0">
                <p className="font-bold text-xs sm:text-sm truncate">{t.type === 'income' ? '🟢' : '🔴'} {catName(t.categoryId)} • {formatIDR(t.amount)}</p>
                <p className="text-[11px] sm:text-xs truncate">{new Date(t.date).toLocaleDateString('id-ID')} • {walletName(wallets, t.walletId || t.wallet)} • {t.note}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button className="btn-brutal bg-brutal-blue rounded-lg text-xs px-2 sm:px-3 py-2 min-h-[40px]" onClick={() => setEditing(t)}>Edit</button>
                <button className="btn-brutal bg-red-300 rounded-lg text-xs px-2 sm:px-3 py-2 min-h-[40px]" onClick={() => setDelId(t.id)}>Hapus</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!delId}
        title="Hapus transaksi ini?"
        onCancel={() => setDelId(null)}
        onConfirm={async () => { await removeTransaction(uid, delId); setDelId(null); refresh() }}
      />
    </div>
  )
}
