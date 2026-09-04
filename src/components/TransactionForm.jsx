import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BrutalButton, BrutalInput, BrutalSelect, CurrencyInput } from './ui.jsx'
import { toDateInputValue } from '../lib/currency.js'

export default function TransactionForm({ categories, wallets = [], initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => ({
    amount: initial?.amount || '',
    type: initial?.type || 'expense',
    categoryId: initial?.categoryId || '',
    date: initial?.date ? toDateInputValue(initial.date) : toDateInputValue(new Date()),
    walletId: initial?.walletId || initial?.wallet || wallets[0]?.id || 'cash',
    note: initial?.note || '',
  }))
  const [err, setErr] = useState('')

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // Ganti tipe: buang kategori lama bila tak cocok agar tak tersangkut diam-diam
  const pickType = (t) => {
    setForm((f) => {
      const stillValid = categories.some((c) => c.id === f.categoryId && (c.type === t || c.type === 'both'))
      return { ...f, type: t, categoryId: stillValid ? f.categoryId : '' }
    })
  }

  const submit = (e) => {
    e.preventDefault()
    setErr('')
    if (Number(form.amount) <= 0) return setErr('Nominal harus lebih dari 0')
    if (!form.categoryId) {
      return setErr(
        filtered.length === 0
          ? `Belum ada kategori ${form.type === 'income' ? 'pemasukan' : 'pengeluaran'}. Buat dulu di Pengaturan.`
          : 'Pilih kategori',
      )
    }
    if (!form.walletId) return setErr('Pilih dompet')
    onSubmit({ ...form, amount: Number(form.amount), date: new Date(form.date).toISOString() })
  }

  const filtered = categories.filter((c) => c.type === form.type || c.type === 'both')

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Tipe transaksi">
        <BrutalButton
          type="button"
          color={form.type === 'expense' ? 'bg-black text-white' : 'bg-white'}
          className="w-full min-h-[44px] text-sm sm:text-base"
          onClick={() => pickType('expense')}
        >
          − Keluar
        </BrutalButton>
        <BrutalButton
          type="button"
          color={form.type === 'income' ? 'bg-black text-white' : 'bg-white'}
          className="w-full min-h-[44px] text-sm sm:text-base"
          onClick={() => pickType('income')}
        >
          + Masuk
        </BrutalButton>
      </div>

      <CurrencyInput
        placeholder="Nominal — cth: 50.000"
        value={form.amount}
        onChange={(raw) => set('amount', raw)}
        required
        aria-label="Nominal rupiah"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {filtered.length === 0 ? (
          <p className="text-xs font-bold bg-brutal-cream border-2 border-black rounded-lg p-2 sm:col-span-2">
            Belum ada kategori {form.type === 'income' ? 'pemasukan' : 'pengeluaran'}.{' '}
            <Link to="/settings" className="underline underline-offset-2">Buat di Pengaturan →</Link>
          </p>
        ) : (
          <BrutalSelect
            value={form.categoryId}
            onChange={(e) => set('categoryId', e.target.value)}
            required
            className="min-h-[44px]"
            aria-label="Kategori"
          >
            <option value="">-- Kategori --</option>
            {filtered.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </BrutalSelect>
        )}

        <BrutalSelect
          value={form.walletId}
          onChange={(e) => set('walletId', e.target.value)}
          required
          className="min-h-[44px]"
          aria-label="Dompet"
        >
          <option value="">-- Dompet --</option>
          {wallets.map((w) => (
            <option key={w.id} value={w.id}>
              {w.icon} {w.name}
            </option>
          ))}
        </BrutalSelect>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <BrutalInput
          type="date"
          value={form.date}
          onChange={(e) => set('date', e.target.value)}
          required
          className="min-h-[44px]"
          aria-label="Tanggal"
        />
        <BrutalInput
          placeholder="Catatan (opsional) — cth: makan siang"
          value={form.note}
          onChange={(e) => set('note', e.target.value)}
          maxLength={120}
          className="min-h-[44px]"
        />
      </div>

      {categories.length === 0 && (
        <p className="text-xs font-bold bg-brutal-cream border-2 border-black rounded-lg p-2">
          Belum ada kategori. <Link to="/settings" className="underline underline-offset-2">Buat kategori dulu →</Link>
        </p>
      )}
      {wallets.length === 0 && (
        <p className="text-xs font-bold bg-brutal-cream border-2 border-black rounded-lg p-2">
          Belum ada dompet. <Link to="/wallets" className="underline underline-offset-2">Buat dompet dulu →</Link>
        </p>
      )}
      {err && <p role="alert" className="text-sm font-bold bg-red-300 border-2 border-black rounded-lg p-2">{err}</p>}

      <div className="flex flex-col-reverse sm:flex-row gap-2">
        {onCancel && (
          <BrutalButton type="button" color="bg-white flex-1" onClick={onCancel} className="min-h-[44px]">
            Batal
          </BrutalButton>
        )}
        <BrutalButton color="bg-brutal-yellow flex-1" type="submit" className="min-h-[44px]">
          SIMPAN
        </BrutalButton>
      </div>
    </form>
  )
}
