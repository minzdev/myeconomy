import { db } from './firebase.js'
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy,
} from 'firebase/firestore'
import { monthKey } from './currency.js'

const LS_KEY = 'rekapinaja_transactions'

function localAll() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]')
  } catch {
    return []
  }
}
function localSave(all) {
  localStorage.setItem(LS_KEY, JSON.stringify(all))
}

export function localDayKey(d) {
  const dt = d instanceof Date ? d : new Date(d)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(dayStr, n) {
  const [y, m, d] = dayStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return localDayKey(dt)
}

// Resolve preset tanggal -> { start, end } (format YYYY-MM-DD) atau null = tanpa filter
export function resolveDateRange(preset, { month, start, end } = {}) {
  const today = localDayKey(new Date())
  switch (preset) {
    case 'today':
      return { start: today, end: today }
    case 'yesterday': {
      const y = addDays(today, -1)
      return { start: y, end: y }
    }
    case 'week':
      return { start: addDays(today, -6), end: today }
    case 'month': {
      const mk = month || monthKey(new Date())
      const [y, m] = mk.split('-').map(Number)
      const last = new Date(y, m, 0).getDate()
      const mm = String(m).padStart(2, '0')
      return { start: `${y}-${mm}-01`, end: `${y}-${mm}-${last}` }
    }
    case 'custom':
      if (!start && !end) return null
      return { start: start || '0000-01-01', end: end || '9999-12-31' }
    case 'all':
    default:
      return null
  }
}

export function filterTx(list, { month, startDate, endDate, type, categoryId, walletId, q } = {}) {
  return list.filter((t) => {
    if (month) {
      const mk = monthKey(new Date(t.date))
      if (mk !== month) return false
    }
    if (startDate || endDate) {
      const day = localDayKey(new Date(t.date))
      if (startDate && day < startDate) return false
      if (endDate && day > endDate) return false
    }
    if (type && type !== 'all' && t.type !== type) return false
    if (categoryId && categoryId !== 'all' && t.categoryId !== categoryId) return false
    if (walletId && walletId !== 'all') {
      const w = t.walletId || t.wallet
      if (w !== walletId) return false
    }
    if (q && !`${t.note || ''} ${t.amount}`.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })
}

export async function listTransactions(uid) {
  if (!db || !uid || uid === 'demo') return localAll().sort((a, b) => +new Date(b.date) - +new Date(a.date))
  try {
    const col = collection(db, 'users', uid, 'transactions')
    const snap = await getDocs(query(col, orderBy('date', 'desc')))
    return snap.docs.map((d) => {
      const v = d.data()
      return {
        id: d.id,
        ...v,
        date: v.date?.toDate ? v.date.toDate().toISOString() : v.date,
      }
    })
  } catch {
    return []
  }
}

export async function addTransaction(uid, data) {
  if (Number(data.amount) <= 0) throw new Error('Nominal harus > 0')
  if (!data.categoryId) throw new Error('Kategori wajib')
  if (!db || !uid || uid === 'demo') {
    const item = { id: `t_${Date.now()}`, uid: uid || 'demo', ...data, createdAt: new Date().toISOString() }
    localSave([item, ...localAll()])
    return item
  }
  const col = collection(db, 'users', uid, 'transactions')
  const ref = await addDoc(col, {
    ...data,
    amount: Number(data.amount),
    uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return { id: ref.id, ...data }
}

export async function updateTransaction(uid, id, data) {
  if (!db || !uid || uid === 'demo') {
    localSave(localAll().map((t) => (t.id === id ? { ...t, ...data } : t)))
    return
  }
  await updateDoc(doc(db, 'users', uid, 'transactions', id), { ...data, updatedAt: serverTimestamp() })
}

export async function removeTransaction(uid, id) {
  if (!db || !uid || uid === 'demo') {
    localSave(localAll().filter((t) => t.id !== id))
    return
  }
  await deleteDoc(doc(db, 'users', uid, 'transactions', id))
}

export function monthlySummary(list) {
  let income = 0
  let expense = 0
  const byCategory = {}
  const daily = {}
  for (const t of list) {
    const amt = Number(t.amount || 0)
    if (t.type === 'income') income += amt
    else expense += amt
    byCategory[t.categoryId] = (byCategory[t.categoryId] || 0) + amt
    const day = new Date(t.date).toISOString().slice(0, 10)
    if (!daily[day]) daily[day] = { date: day, income: 0, expense: 0 }
    daily[day][t.type] += amt
  }
  return {
    income,
    expense,
    balance: income - expense,
    byCategory,
    daily: Object.values(daily).sort((a, b) => a.date.localeCompare(b.date)),
  }
}

export function exportCSV(list) {
  const head = 'date,type,category,amount,wallet,note\n'
  const rows = list.map((t) =>
    [t.date, t.type, t.categoryId, t.amount, t.walletId || t.wallet || '', `"${(t.note || '').replace(/"/g, '""')}"`].join(','),
  )
  return head + rows.join('\n')
}
