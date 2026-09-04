import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth'
import { auth, db } from '../lib/firebase.js'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

// Mode demo: jika Firebase env belum diisi, pakai user lokal agar UI bisa dites
const DEMO_KEY = 'rekapinaja_demo_user'
const isDemo = !auth

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (isDemo) {
      try {
        return JSON.parse(localStorage.getItem(DEMO_KEY) || 'null')
      } catch {
        return null
      }
    }
    return null
  })
  const [loading, setLoading] = useState(!isDemo)

  useEffect(() => {
    if (isDemo) return
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      setLoading(false)
      if (u && db) {
        try {
          await setDoc(
            doc(db, 'users', u.uid),
            { email: u.email, displayName: u.displayName || '', photoURL: u.photoURL || '', updatedAt: serverTimestamp() },
            { merge: true },
          )
        } catch {}
      }
    })
    return unsub
  }, [])

  const login = async (email, password) => {
    if (isDemo) {
      const u = { uid: 'demo', email }
      localStorage.setItem(DEMO_KEY, JSON.stringify(u))
      setUser(u)
      return u
    }
    return signInWithEmailAndPassword(auth, email, password)
  }

  const register = async (name, email, password) => {
    if (isDemo) {
      const u = { uid: 'demo', email, displayName: name }
      localStorage.setItem(DEMO_KEY, JSON.stringify(u))
      setUser(u)
      return u
    }
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    if (name) await updateProfile(cred.user, { displayName: name })
    return cred
  }

  const reset = (email) => {
    if (isDemo) return Promise.resolve()
    return sendPasswordResetEmail(auth, email)
  }

  const logout = async () => {
    if (isDemo) {
      localStorage.removeItem(DEMO_KEY)
      setUser(null)
      return
    }
    return signOut(auth)
  }

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, reset, logout, isDemo }}>
      {children}
    </AuthCtx.Provider>
  )
}
