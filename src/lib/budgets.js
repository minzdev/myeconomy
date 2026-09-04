import { db } from './firebase.js'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'

const LS_KEY = 'rekapinaja_budgets'

function localAll() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]')
  } catch {
    return []
  }
}

export async function listBudgets(uid, month) {
  if (!db || !uid || uid === 'demo') return localAll().filter((b) => !month || b.month === month)
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'budgets'))
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return month ? all.filter((b) => b.month === month) : all
  } catch {
    return []
  }
}

export async function upsertBudget(uid, { categoryId, month, limit }) {
  if (!db || !uid || uid === 'demo') {
    const all = localAll()
    const i = all.findIndex((b) => b.categoryId === categoryId && b.month === month)
    if (i >= 0) all[i] = { ...all[i], limit: Number(limit) }
    else all.push({ id: `b_${Date.now()}`, categoryId, month, limit: Number(limit) })
    localStorage.setItem(LS_KEY, JSON.stringify(all))
    return
  }
  const existing = (await listBudgets(uid, month)).find((b) => b.categoryId === categoryId)
  if (existing) {
    await updateDoc(doc(db, 'users', uid, 'budgets', existing.id), { limit: Number(limit) })
  } else {
    await addDoc(collection(db, 'users', uid, 'budgets'), {
      categoryId, month, limit: Number(limit), uid, createdAt: serverTimestamp(),
    })
  }
}

export async function removeBudget(uid, id) {
  if (!db || !uid || uid === 'demo') {
    localStorage.setItem(LS_KEY, JSON.stringify(localAll().filter((b) => b.id !== id)))
    return
  }
  await deleteDoc(doc(db, 'users', uid, 'budgets', id))
}
