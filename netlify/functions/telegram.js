// Netlify Function: Bot Telegram My Economy (gratis, tanpa sleep).
// Satu function melayani 4 route (lihat netlify.toml rewrite /api/telegram/*):
//   POST   /api/telegram/webhook   <- webhook Telegram (verifikasi secret_token)
//   GET    /api/telegram/status    <- status tautan (butuh Firebase ID token)
//   POST   /api/telegram/link-code <- buat kode tautan (butuh Firebase ID token)
//   DELETE /api/telegram/link      <- putuskan tautan (butuh Firebase ID token)
// Env (Site settings > Environment variables):
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY,
//   TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET
import admin from 'firebase-admin'
import crypto from 'crypto'
import { handleTelegramUpdate, telegramEnabled } from '../../server/telegram.js'

let db = null
function getDb() {
  if (db) return db
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) return null
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    })
  }
  db = admin.firestore()
  return db
}

async function uidFromAuth(headers) {
  const token = (headers.authorization || headers.Authorization || '').replace('Bearer ', '')
  if (!token) return null
  try {
    const decoded = await admin.auth().verifyIdToken(token)
    return decoded.uid
  } catch {
    return null
  }
}

const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export async function handler(event) {
  const { httpMethod: method, path } = event

  // 1. Webhook Telegram
  if (path.endsWith('/webhook') && method === 'POST') {
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET || ''
    const got = event.headers['x-telegram-bot-api-secret-token']
    if (expected && got !== expected) {
      console.warn('[telegram] secret webhook tidak cocok')
      return { statusCode: 401, body: 'unauthorized' }
    }
    if (!expected) console.warn('[telegram] TELEGRAM_WEBHOOK_SECRET kosong, verifikasi dilewati')
    if (!telegramEnabled) {
      console.warn('[telegram] TELEGRAM_BOT_TOKEN belum diisi')
      return { statusCode: 200, body: 'ok' }
    }
    let update = null
    try {
      update = JSON.parse(event.body || '{}')
    } catch {
      return { statusCode: 200, body: 'ok' }
    }
    // Tunggu sampai selesai (jangan fire-and-forget):
    // runtime serverless mematikan proses begitu response dikirim.
    // Masih aman dari retry Telegram karena prosesnya < 2 detik.
    const database = getDb()
    await handleTelegramUpdate(database, update).catch((e) => console.error('[telegram]', e.message))
    return { statusCode: 200, body: 'ok' }
  }

  const database = getDb()
  if (!database) return json(503, { error: 'Backend belum terhubung Firestore (cek env Netlify)' })

  // 2 & 3. Butuh login Firebase
  const uid = await uidFromAuth(event.headers)
  if (!uid) return json(401, { error: 'Unauthorized' })

  if (path.endsWith('/status') && method === 'GET') {
    const snap = await database.collection('telegram_chats').where('uid', '==', uid).get()
    const first = snap.docs[0]?.data()
    const linkedAt = first?.linkedAt
    return json(200, {
      linked: snap.size > 0,
      count: snap.size,
      linkedAt: linkedAt?.toDate ? linkedAt.toDate().toISOString() : null,
    })
  }

  if (path.endsWith('/link-code') && method === 'POST') {
    const code = crypto.randomBytes(3).toString('hex').toUpperCase()
    await database.collection('telegram_link_codes').doc(code).set({ uid, createdAt: new Date() })
    return json(200, { code, expiresInMinutes: 15 })
  }

  if (path.endsWith('/link') && method === 'DELETE') {
    const snap = await database.collection('telegram_chats').where('uid', '==', uid).get()
    await Promise.all(snap.docs.map((d) => d.ref.delete()))
    return json(200, { ok: true, removed: snap.size })
  }

  return json(404, { error: 'Not found' })
}
