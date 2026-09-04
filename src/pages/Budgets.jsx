import { useState } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { useAuth } from '../contexts/AuthContext.jsx'
import { listBudgets, upsertBudget, removeBudget } from '../lib/budgets.js'
import { listTransactions, filterTx } from '../lib/transactions.js'
import { listCategories } from '../lib/categories.js'
import { formatIDR, monthKey } from '../lib/currency.js'
import { BrutalButton, BrutalCard, BrutalInput, BrutalMonth, BrutalSelect, CurrencyInput, Loading } from '../components/ui.jsx'
import { friendlyDbError } from '../lib/errors.js'

export default function Budgets() {
  const { user } = useAuth()
  const uid = user?.uid || 'demo'
  const qc = useQueryClient()
  const [month, setMonth] = useState(monthKey())
  const [catId, setCatId] = useState('')
  const [limit, setLimit] = useState('')
  const [err, setErr] = useState('')

  const { data: budgets = [], isLoading } = useQuery(['budgets', uid, month], () => listBudgets(uid, month))
  const { data: all = [] } = useQuery(['tx', uid], () => listTransactions(uid))
  const { data: cats = [] } = useQuery(['cats', uid], () => listCategories(uid))
  const refresh = () => qc.invalidateQueries(['budgets', uid, month])

  if (isLoading) return <Loading />
  const monthTx = filterTx(all, { month, type: 'expense' })
  const spentByCat = {}
  monthTx.forEach((t) => { spentByCat[t.categoryId] = (spentByCat[t.categoryId] || 0) + Number(t.amount) })

  return (
    <div className="space-y-4">
      <BrutalCard color="bg-brutal-yellow">
        <h2 className="font-display text-2xl">BUDGET {month}</h2>
        <BrutalMonth value={month} onChange={(e) => setMonth(e.target.value)} className="mt-2 sm:max-w-[240px]" aria-label="Pilih bulan" />
      </BrutalCard>

      <BrutalCard>
        <form
          className="flex flex-col sm:flex-row gap-2"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!catId || !limit) return
            setErr('')
            try {
              await upsertBudget(uid, { categoryId: catId, month, limit })
              setCatId(''); setLimit(''); refresh()
            } catch (e2) {
              setErr(friendlyDbError(e2))
            }
          }}
        >
          <BrutalSelect value={catId} onChange={(e) => setCatId(e.target.value)} className="flex-1">
            <option value="">-- Kategori --</option>
            {cats.filter((c) => c.type !== 'income').map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </BrutalSelect>
          <CurrencyInput placeholder="Limit Rp" value={limit} onChange={setLimit} className="flex-1" aria-label="Limit budget" />
          <BrutalButton color="bg-black text-white" type="submit">Simpan</BrutalButton>
        </form>
        {err && <p role="alert" className="text-sm font-bold bg-red-300 border-2 border-black rounded-lg p-2 mt-2">{err}</p>}
      </BrutalCard>

      <div className="space-y-2">
        {budgets.map((b) => {
          const spent = spentByCat[b.categoryId] || 0
          const pct = b.limit > 0 ? Math.min(100, Math.round((spent / b.limit) * 100)) : 0
          const bar = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-400' : 'bg-green-500'
          return (
            <BrutalCard key={b.id}>
              <div className="flex justify-between font-bold text-sm">
                <span>{cats.find((c) => c.id === b.categoryId)?.name || b.categoryId}</span>
                <span>{formatIDR(spent)} / {formatIDR(b.limit)} ({pct}%)</span>
              </div>
              <div className="border-2 border-black rounded-full h-5 mt-2 overflow-hidden bg-white">
                <div className={`${bar} h-full border-r-2 border-black`} style={{ width: `${pct}%` }} />
              </div>
              {pct >= 80 && <p className="text-xs font-bold mt-1">{pct >= 100 ? '⛔ Over budget!' : '⚠️ Hampir habis (80%+)'}</p>}
              <BrutalButton color="bg-red-300 mt-2 text-xs" onClick={async () => { await removeBudget(uid, b.id); refresh() }}>
                Hapus
              </BrutalButton>
            </BrutalCard>
          )
        })}
        {budgets.length === 0 && <p className="font-bold text-sm">Belum ada budget bulan ini.</p>}
      </div>
    </div>
  )
}
