import { useEffect, useState } from 'react'
import LoginPage from './pages/LoginPage'
import MapPage from './pages/MapPage'
import AuditLogPage from './pages/AuditLogPage'
import CitiesPage from './pages/CitiesPage'

function isLoggedIn(): boolean {
  return !!localStorage.getItem('token')
}

export default function App() {
  const [authed, setAuthed] = useState(isLoggedIn())
  const path = window.location.pathname

  useEffect(() => {
    if (!authed && path !== '/login') {
      window.history.replaceState(null, '', '/login')
    }
  }, [authed, path])

  if (!authed) {
    return <LoginPage onLogin={() => { setAuthed(true); window.history.replaceState(null, '', '/') }} />
  }

  if (path === '/audit') return <AuditLogPage />
  if (path === '/cities') return <CitiesPage />

  return <MapPage />
}
