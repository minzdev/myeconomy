// Firebase client - My Economy (project: rekapinaja-ecd1f)
// Nilai dibaca dari .env (lihat .env.example). Tanpa env -> mode demo lokal.
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const isConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId)

let app = null
let auth = null
let db = null
let analytics = null

if (isConfigured) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)

  // Bersihkan sisa data seed/demo lokal sekali (kita sudah pakai Firebase asli)
  try {
    for (const k of [
      'rekapinaja_transactions',
      'rekapinaja_categories',
      'rekapinaja_budgets',
      'rekapinaja_wallets',
      'rekapinaja_demo_user',
    ]) {
      localStorage.removeItem(k)
    }
  } catch {}

  // Analytics opsional, jangan gagalkan app bila diblokir
  if (firebaseConfig.measurementId) {
    import('firebase/analytics')
      .then(({ getAnalytics, isSupported }) => isSupported().then((ok) => ok && getAnalytics(app)))
      .then((a) => { analytics = a || null })
      .catch(() => {})
  }
} else {
  console.warn('[firebase] Env belum diisi, jalan mode demo lokal. Lihat .env.example')
}

export { app, auth, db, analytics, isConfigured }
