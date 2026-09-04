// My Economy API - Node.js + Express + Firebase Admin
// Jalan: cd server && npm install && npm run dev
// Env: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, PORT
import express from 'express'
import cors from 'cors'
import admin from 'firebase-admin'

const app = express()
app.use(cors())
app.use(express.json())

const hasCreds = !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)
let db = null
if (hasCreds) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
  db = admin.firestore()
} else {
  console.warn('[api] Firebase Admin env belum diisi, jalan mode stateless (validasi saja).')
}

async function authUid(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!db) {
    req.uid = 'demo'
    return next()
  }
  try {
    const decoded = await admin.auth().verifyIdToken(token)
    req.uid = decoded.uid
    next()
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }
}

function validateTx(b) {
  if (Number(b.amount) <= 0) return 'amount harus > 0'
  if (!b.categoryId) return 'categoryId wajib'
  if (!['income', 'expense'].includes(b.type)) return 'type harus income/expense'
  if (!b.date) return 'date wajib'
  return null
}

app.get('/health', (req, res) => res.json({ ok: true, mode: db ? 'firestore' : 'stateless' }))

app.get('/api/summary/monthly', authUid, async (req, res) => {
  const month = req.query.month // 2026-09
  if (!month) return res.status(400).json({ error: 'month required YYYY-MM' })
  if (!db) return res.json({ month, income: 0, expense: 0, balance: 0, note: 'stateless - agregasi dilakukan di frontend' })
  const snap = await db.collection('users').doc(req.uid).collection('transactions').get()
  let income = 0
  let expense = 0
  const byCategory = {}
  snap.forEach((d) => {
    const t = d.data()
    const dISO = t.date?.toDate ? t.date.toDate().toISOString().slice(0, 7) : String(t.date).slice(0, 7)
    if (dISO !== month) return
    const amt = Number(t.amount || 0)
    if (t.type === 'income') income += amt
    else expense += amt
    byCategory[t.categoryId] = (byCategory[t.categoryId] || 0) + amt
  })
  res.json({ month, income, expense, balance: income - expense, byCategory })
})

app.post('/api/transactions/validate', authUid, (req, res) => {
  const err = validateTx(req.body)
  if (err) return res.status(400).json({ error: err })
  res.json({ ok: true })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`[api] listening :${PORT}`))
