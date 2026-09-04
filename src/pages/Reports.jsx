import { useState } from 'react'
import { useQuery } from 'react-query'
import { useAuth } from '../contexts/AuthContext.jsx'
import { listTransactions, filterTx, monthlySummary } from '../lib/transactions.js'
import { listCategories } from '../lib/categories.js'
import { formatIDR, monthKey } from '../lib/currency.js'
import { BrutalButton, BrutalCard, Loading, EmptyState } from '../components/ui.jsx'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts'

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
        <h2 className="font-display text-2xl">LAPORAN {month}</h2>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input-brutal bg-white w-full sm:w-auto mt-2 font-bold min-h-[44px]" />
        <p className="font-bold mt-2">Masuk: {formatIDR(sum.income)} | Keluar: {formatIDR(sum.expense)} | Sisa: {formatIDR(sum.balance)}</p>
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
          <BrutalCard>
            <h3 className="font-display mb-2">PER KATEGORI</h3>
            <div style={{ height: 260 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" outerRadius={100} label>
                    {pie.map((p, i) => (
                      <Cell key={i} fill={p.fill} stroke="#000" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatIDR(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </BrutalCard>

          <BrutalCard>
            <h3 className="font-display mb-2">HARIAN</h3>
            <div style={{ height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={sum.daily}>
                  <XAxis dataKey="date" tickFormatter={(d) => d.slice(8)} fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v) => formatIDR(v)} />
                  <Bar dataKey="income" fill="#23A094" stroke="#000" />
                  <Bar dataKey="expense" fill="#FF90E8" stroke="#000" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </BrutalCard>
        </>
      )}
    </div>
  )
}
