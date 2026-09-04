import { useState } from 'react'
import { useQuery } from 'react-query'
import { useAuth } from '../contexts/AuthContext.jsx'
import { listTransactions, filterTx, monthlySummary } from '../lib/transactions.js'
import { listCategories } from '../lib/categories.js'
import { formatIDR, monthKey, compactIDR } from '../lib/currency.js'
import { BrutalButton, BrutalCard, Loading, EmptyState } from '../components/ui.jsx'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

const COLORS = ['#FF90E8', '#90CDF4', '#FFDC58', '#23A094', '#FF6B6B', '#B388FF', '#69F0AE']

export default function Reports() {
  const { user } = useAuth()
  const uid = user?.uid || 'demo'
  const [month, setMonth] = useState(monthKey())
  const { data: all = [], isLoading } = useQuery(['tx', uid], () => listTransactions(uid))
  const { data: cats = [] } = useQuery(['cats', uid], () => listCategories(uid))

  if (isLoading) return <Loading />
  const list = filterTx(all, { month })
  const sum = monthlySummary(list)
  const pie = Object.entries(sum.byCategory).map(([id, value], i) => ({
    name: cats.find((c) => c.id === id)?.name || id,
    value,
    fill: COLORS[i % COLORS.length],
  }))

  return (
    <div className="space-y-4">
      <BrutalCard color="bg-brutal-blue">
        <h2 className="font-display text-xl sm:text-2xl">LAPORAN {month}</h2>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input-brutal bg-white w-full sm:w-auto mt-2 font-bold min-h-[44px]" />
        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          <div className="border-2 border-black rounded-lg bg-white px-1 py-2 min-w-0">
            <p className="text-[10px] sm:text-xs font-bold">MASUK</p>
            <p className="font-display text-xs sm:text-base truncate">{formatIDR(sum.income)}</p>
          </div>
          <div className="border-2 border-black rounded-lg bg-white px-1 py-2 min-w-0">
            <p className="text-[10px] sm:text-xs font-bold">KELUAR</p>
            <p className="font-display text-xs sm:text-base truncate">{formatIDR(sum.expense)}</p>
          </div>
          <div className="border-2 border-black rounded-lg bg-black text-white px-1 py-2 min-w-0">
            <p className="text-[10px] sm:text-xs font-bold">SISA</p>
            <p className="font-display text-xs sm:text-base truncate">{formatIDR(sum.balance)}</p>
          </div>
        </div>
        {list.length > 0 && (
          <BrutalButton
            color="bg-white mt-3 w-full sm:w-auto"
            className="min-h-[44px] text-sm"
            onClick={async () => {
              const { exportReportPDF } = await import('../lib/pdf.js')
              exportReportPDF({
                month,
                summary: sum,
                byCategoryRows: Object.entries(sum.byCategory),
                catName: (id) => cats.find((c) => c.id === id)?.name || id,
              })
            }}
          >
            ⬇ Export PDF
          </BrutalButton>
        )}
      </BrutalCard>

      {list.length === 0 ? (
        <EmptyState title="Belum ada data bulan ini" />
      ) : (
        <>
          <BrutalCard className="p-4 sm:p-5">
            <h3 className="font-display text-sm sm:text-base mb-2">PER KATEGORI</h3>
            <div className="h-[180px] sm:h-[200px] w-full">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" outerRadius={75} innerRadius={30}>
                    {pie.map((p, i) => (
                      <Cell key={i} fill={p.fill} stroke="#000" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatIDR(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 space-y-1">
              {pie.map((p, i) => (
                <li key={i} className="flex items-center gap-2 text-xs sm:text-sm font-bold">
                  <span aria-hidden="true" className="w-3 h-3 rounded-sm border-2 border-black shrink-0" style={{ background: p.fill }} />
                  <span className="truncate flex-1">{p.name}</span>
                  <span className="shrink-0">{formatIDR(p.value)}</span>
                </li>
              ))}
            </ul>
          </BrutalCard>

          <BrutalCard className="p-4 sm:p-5">
            <h3 className="font-display text-sm sm:text-base mb-2">HARIAN</h3>
            <div className="h-[180px] sm:h-[200px] w-full">
              <ResponsiveContainer>
                <BarChart data={sum.daily} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(d) => d.slice(8)} fontSize={11} tickLine={false} />
                  <YAxis fontSize={11} width={40} tickFormatter={(v) => compactIDR(v)} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v) => formatIDR(v)} />
                  <Bar dataKey="income" fill="#23A094" stroke="#000" maxBarSize={26} />
                  <Bar dataKey="expense" fill="#FF90E8" stroke="#000" maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </BrutalCard>
        </>
      )}
    </div>
  )
}
