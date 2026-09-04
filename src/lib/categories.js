import { db } from './firebase.js'
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore'

const LS_KEY = 'rekapinaja_categories'

function localList() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]')
  } catch {
    return []
  }
}

export async function listCategories(uid) {
  if (!db || !uid || uid === 'demo') return localList()
  try {
    const col = collection(db, 'users', uid, 'categories')
    const snap = await getDocs(query(col, orderBy('name')))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch {
    return []
  }
}

export async function addCategory(uid, data) {
  if (!db || !uid || uid === 'demo') {
    const cur = localList()
    const item = { id: `c_${Date.now()}`, ...data }
    localStorage.setItem(LS_KEY, JSON.stringify([...cur, item]))
    return item
  }
  const col = collection(db, 'users', uid, 'categories')
  const ref = await addDoc(col, { ...data, uid, createdAt: serverTimestamp() })
  return { id: ref.id, ...data }
}

export async function removeCategory(uid, id) {
  if (!db || !uid || uid === 'demo') {
    localStorage.setItem(LS_KEY, JSON.stringify(localList().filter((c) => c.id !== id)))
    return
  }
  await deleteDoc(doc(db, 'users', uid, 'categories', id))
}
