import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/layout/Sidebar'
import { Topbar } from '../components/layout/Topbar'
import { useAuth } from '../contexts/AuthContext'

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { role } = useAuth()

  // Pass the actual role from JWT — sidebar filters nav items based on this
  const activeRole = (role as any) || 'worker'

  return (
    <div className="bg-background min-h-screen">
      <Sidebar userRole={activeRole} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
