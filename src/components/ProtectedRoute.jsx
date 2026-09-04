import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <div className="card-brutal p-6 mt-6">Memuat sesi...</div>
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />
  return children
}
