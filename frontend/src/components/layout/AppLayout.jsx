import { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'
import { isAuthenticated } from '../../services/auth.js'
import LoadingState from '../ui/LoadingState.jsx'

const AppLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [checking, setChecking] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { replace: true })
    }
    setChecking(false)
  }, [navigate])

  if (checking || !isAuthenticated()) {
    return (
      <div className="flex h-screen items-center justify-center bg-ink-950">
        <LoadingState label="Checking session…" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-ink-950">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="app-surface flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout
