// Netlify Function: kirim email reset password dengan template HTML profesional.
// Dipanggil frontend via POST /api/auth/reset-email (lihat redirect di netlify.toml).
// Env (Netlify Dashboard > Site settings > Environment variables):
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY,
//   RESEND_API_KEY, MAIL_FROM, APP_NAME (opsional), PASSWORD_RESET_CONTINUE_URL (opsional)
import admin from 'firebase-admin'
import { passwordResetEmail, passwordResetText } from '../../server/emailTemplate.js'

function getAuth() {
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
  return admin.auth()
}

const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

// Rate-limit sederhana per instance (best-effort di serverless)
const attempts = new Map()

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  let email = ''
  try {
    email = String(JSON.parse(event.body || '{}').email || '').trim().toLowerCase()
  } catch {
    return json(400, { error: 'Email tidak valid' })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { error: 'Email tidak valid' })
  }

  const auth = getAuth()
  if (!auth) return json(503, { error: 'Backend belum terhubung Firestore (cek env Netlify)' })
  const apiKey = process.env.RESEND_API_KEY || ''
  const from = process.env.MAIL_FROM || ''
  if (!apiKey || !from) {
    return json(503, { error: 'Email service belum dikonfigurasi (RESEND_API_KEY / MAIL_FROM)' })
  }

  const key = `${event.headers['client-ip'] || ''}:${email}`
  const now = Date.now()
  const hist = (attempts.get(key) || []).filter((t) => now - t < 10 * 60 * 1000)
  if (hist.length >= 3) return json(429, { error: 'Terlalu sering. Coba lagi 10 menit.' })
  hist.push(now)
  attempts.set(key, hist)

  try {
    const appName = process.env.APP_NAME || 'My Economy'
    const continueUrl = process.env.PASSWORD_RESET_CONTINUE_URL || ''
    const actionSettings = continueUrl ? { url: continueUrl, handleCodeInApp: false } : undefined
    const resetUrl = await auth.generatePasswordResetLink(email, actionSettings)

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `Reset password ${appName} kamu 🔑`,
        html: passwordResetEmail({ email, resetUrl, appName }),
        text: passwordResetText({ email, resetUrl, appName }),
      }),
    })
    if (!r.ok) {
      console.error('[reset-email] resend gagal:', r.status, (await r.text().catch(() => '')).slice(0, 300))
      return json(502, { error: 'Gagal mengirim email, coba lagi.' })
    }
    return json(200, { ok: true })
  } catch (e) {
    // Jangan bocorkan apakah email terdaftar atau tidak (anti user-enumeration)
    console.error('[reset-email]', e.message)
    return json(200, { ok: true })
  }
}
