import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from 'react-query'
import { useAuth } from '../contexts/AuthContext.jsx'
import { listTransactions, monthlySummary, addTransaction, filterTx } from '../lib/transactions.js'
import { listCategories } from '../lib/categories.js'
import { listWallets, calcWalletBalances, walletName } from '../lib/wallets.js'
import { formatIDR, monthKey, compactIDR } from '../lib/currency.js'
import { BrutalButton, BrutalCard, EmptyState, Loading } from '../components/ui.jsx'
import { friendlyDbError } from '../lib/errors.js'
import TransactionForm from '../components/TransactionForm.jsx'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function Dashboard() {
  const { user } = useAuth()
  const uid = user?.uid || 'demo'
  const qc = useQueryClient()
  const [month, setMonth] = useState(monthKey())
  const [showForm, setShowForm] = useState(null)
  const [submitErr, setSubmitErr] = useState('')
  const [savedTick, setSavedTick] = useState(0)

  const { data: all = [], isLoading } = useQuery(['tx', uid], () => listTransactions(uid))
  const { data: cats = [] } = useQuery(['cats', uid], () => listCategories(uid))
  const { data: wallets = [] } = useQuery(['wallets', uid], () => listWallets(uid))

  if (isLoading) return <Loading />

  const filtered = filterTx(all, { month })
  const sum = monthlySummary(filtered)
  const balances = calcWalletBalances(wallets, all)
  const catName = (id) => cats.find((c) => c.id === id)?.name || id

  const handleAdd = async (payload) => {
    setSubmitErr('')
    try {
      await addTransaction(uid, payload)
      qc.invalidateQueries(['tx', uid])
      setShowForm(null)
      setSavedTick(Date.now())
      setTimeout(() => setSavedTick(0), 4000)
    } catch (e2) {
      setSubmitErr(friendlyDbError(e2))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="input-brutal bg-white w-auto font-bold min-h-[44px]"
          aria-label="Pilih bulan"
        />
        <span className="text-xs sm:text-sm font-bold">Cashflow {month}</span>
      </div>

      <BrutalCard color="bg-brutal-green" className="p-4 sm:p-5">
        <p className="font-bold text-xs sm:text-sm">TOTAL SALDO BULAN INI</p>
        <h1 className="font-display text-3xl sm:text-4xl break-words">{formatIDR(sum.balance)}</h1>
      </BrutalCard>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <BrutalCard color="bg-brutal-blue" className="p-4 sm:p-5">
          <p className="font-bold text-xs sm:text-sm">PEMASUKAN</p>
          <p className="font-display text-lg sm:text-2xl break-words">{formatIDR(sum.income)}</p>
        </BrutalCard>
        <BrutalCard color="bg-brutal-pink" className="p-4 sm:p-5">
          <p className="font-bold text-xs sm:text-sm">PENGELUARAN</p>
          <p className="font-display text-lg sm:text-2xl break-words">{formatIDR(sum.expense)}</p>
        </BrutalCard>
      </div>

      <BrutalCard className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="font-display text-sm sm:text-base">DOMPET SAYA</h3>
          <Link to="/wallets" className="text-xs font-bold underline underline-offset-2">Kelola →</Link>
        </div>
        {wallets.length === 0 ? (
          <p className="text-sm font-bold">Belum ada dompet. <Link to="/wallets" className="underline">Buat dulu</Link>.</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {wallets.map((w) => (
              <div key={w.id} className="shrink-0 min-w-[140px] border-2 border-black rounded-lg px-3 py-2 bg-brutal-cream font-bold">
                <p className="text-xs truncate">{w.icon} {w.name}</p>
                <p className="text-sm">{formatIDR(balances[w.id] || 0)}</p>
              </div>
            ))}
          </div>
        )}
      </BrutalCard>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <BrutalButton color="bg-brutal-yellow w-full" onClick={() => setShowForm({ type: 'income' })} className="min-h-[48px] text-sm sm:text-base">
          + Pemasukan
        </BrutalButton>
        <BrutalButton color="bg-white w-full" onClick={() => setShowForm({ type: 'expense' })} className="min-h-[48px] text-sm sm:text-base">
          + Pengeluaran
        </BrutalButton>
      </div>

      {savedTick > 0 && (
        <p role="status" className="card-brutal p-4 bg-green-300 font-bold text-sm">
          ✓ Transaksi tersimpan.
        </p>
      )}

      {showForm && (
        <BrutalCard color="bg-white" className="p-4 sm:p-5">
          {submitErr && <p role="alert" className="text-sm font-bold bg-red-300 border-2 border-black rounded-lg p-2 mb-3">{submitErr}</p>}
          <TransactionForm key={showForm.type} categories={cats} wallets={wallets} initial={showForm} onSubmit={handleAdd} onCancel={() => setShowForm(null)} />
        </BrutalCard>
      )}

      <BrutalCard className="p-4 sm:p-5">
        <h3 className="font-display text-sm sm:text-base mb-2">GRAFIK HARIAN</h3>
        {sum.daily.length === 0 ? (
          <EmptyState title="Belum ada transaksi" desc="Klik + Pemasukan / Pengeluaran" />
        ) : (
          <div className="h-[180px] sm:h-[200px] w-full">
            <ResponsiveContainer>
              <BarChart data={sum.daily} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d) => d.slice(8)} fontSize={11} tickLine={false} />
                <YAxis fontSize={11} width={40} tickFormatter={(v) => compactIDR(v)} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => formatIDR(v)} />
                <Bar dataKey="income" fill="#23A094" stroke="#000" strokeWidth={1} maxBarSize={26} />
                <Bar dataKey="expense" fill="#FF6B6B" stroke="#000" strokeWidth={1} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </BrutalCard>

      <BrutalCard className="p-4 sm:p-5">
        <h3 className="font-display text-sm sm:text-base mb-2">5 TRANSAKSI TERAKHIR</h3>
        <div className="space-y-2">
          {filtered.slice(0, 5).map((t) => (
            <div key={t.id} className="flex justify-between items-center gap-2 border-2 border-black rounded-lg px-3 py-2 font-bold text-xs sm:text-sm">
              <span className="truncate">
                {t.type === 'income' ? '🟢' : '🔴'} {catName(t.categoryId)} • {t.note || '-'}
              </span>
              <span className="shrink-0">{formatIDR(t.amount)}</span>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-sm">Kosong.</p>}
        </div>
      </BrutalCard>
    </div>
  )
}
