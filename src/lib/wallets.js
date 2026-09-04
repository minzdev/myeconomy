import { db } from './firebase.js'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore'

export const WALLET_TYPES = [
  { id: 'cash', label: 'Cash', icon: '💵' },
  { id: 'bank', label: 'Bank', icon: '🏦' },
  { id: 'ewallet', label: 'E-Wallet', icon: '📱' },
  { id: 'emoney', label: 'E-Money', icon: '💳' },
]

const LS_KEY = 'rekapinaja_wallets'

export function walletTypeLabel(type) {
  return WALLET_TYPES.find((t) => t.id === type)?.label || type
}

function localList() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]')
  } catch {
    return []
  }
}

export async function listWallets(uid) {
  if (!db || !uid || uid === 'demo') return localList()
  try {
    const col = collection(db, 'users', uid, 'wallets')
    const snap = await getDocs(query(col, orderBy('name')))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch {
    return []
  }
}

export async function addWallet(uid, data) {
  const payload = {
    name: (data.name || '').trim(),
    type: data.type || 'cash',
    icon: data.icon || WALLET_TYPES.find((t) => t.id === data.type)?.icon || '💵',
    color: data.color || '#FFFFFF',
    initialBalance: Number(data.initialBalance || 0),
  }
  if (!payload.name) throw new Error('Nama dompet wajib')
  if (!db || !uid || uid === 'demo') {
    const cur = localList()
    const item = { id: `w_${Date.now()}`, ...payload }
    localStorage.setItem(LS_KEY, JSON.stringify([...cur, item]))
    return item
  }
  const ref = await addDoc(collection(db, 'users', uid, 'wallets'), { ...payload, uid, createdAt: serverTimestamp() })
  return { id: ref.id, ...payload }
}

export async function updateWallet(uid, id, data) {
  const payload = {}
  if (data.name !== undefined) payload.name = data.name.trim()
  if (data.type !== undefined) payload.type = data.type
  if (data.icon !== undefined) payload.icon = data.icon
  if (data.color !== undefined) payload.color = data.color
  if (data.initialBalance !== undefined) payload.initialBalance = Number(data.initialBalance || 0)
  if (payload.name !== undefined && !payload.name) throw new Error('Nama dompet wajib')

  if (!db || !uid || uid === 'demo') {
    localStorage.setItem(LS_KEY, JSON.stringify(localList().map((w) => (w.id === id ? { ...w, ...payload } : w))))
    return
  }
  await updateDoc(doc(db, 'users', uid, 'wallets', id), payload)
}

export async function removeWallet(uid, id) {
  if (!db || !uid || uid === 'demo') {
    localStorage.setItem(LS_KEY, JSON.stringify(localList().filter((w) => w.id !== id)))
    return
  }
  await deleteDoc(doc(db, 'users', uid, 'wallets', id))
}

// Saldo per dompet = initialBalance + income - expense dari transaksi
export function calcWalletBalances(wallets, transactions) {
  const map = {}
  for (const w of wallets) map[w.id] = Number(w.initialBalance || 0)
  for (const t of transactions || []) {
    const key = t.walletId || t.wallet
    if (key && map[key] !== undefined) {
      map[key] += t.type === 'income' ? Number(t.amount || 0) : -Number(t.amount || 0)
    }
  }
  return map
}

export function walletName(wallets, id) {
  if (!id) return '-'
  const w = wallets.find((x) => x.id === id)
  if (w) return `${w.icon || ''} ${w.name}`.trim()
  // fallback id lama: cash/ewallet/bank
  const t = WALLET_TYPES.find((x) => x.id === id)
  return t ? `${t.icon} ${t.label}` : id
}
