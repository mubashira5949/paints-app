import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { MainLayout } from './layouts/MainLayout'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Production from './pages/Production'
import ProductionDetail from './pages/ProductionDetail'
import ProductionPackaging from './pages/ProductionPackaging'
import ProductionRunForm from './pages/ProductionRunForm'
import Users from './pages/Users'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Paints from './pages/Paints'
import Formulas from './pages/Formulas'
import Sales from './pages/Sales'
import SalesHistory from './pages/SalesHistory'
import Orders from './pages/Orders'
import Clients from './pages/Clients'
import Losses from './pages/Losses'
import RawMaterials from './pages/RawMaterials'
import Suppliers from './pages/Suppliers'
import PurchaseOrders from './pages/PurchaseOrders'
import SharedPurchaseOrder from './pages/SharedPurchaseOrder'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/po/:token" element={<SharedPurchaseOrder />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />

              <Route path="dashboard" element={<Dashboard />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="paints" element={<Paints />} />
              <Route path="formulas" element={<Formulas />} />
              <Route path="production" element={<Production />} />
              <Route path="production/new" element={<ProductionRunForm />} />
              <Route path="production/:id" element={<ProductionDetail />} />
              <Route path="production/:id/packaging" element={<ProductionPackaging />} />
              <Route path="sales/new" element={<Sales />} />
              <Route path="sales/history" element={<SalesHistory />} />
              <Route path="sales/orders" element={<Orders />} />
              <Route path="clients" element={<Clients />} />

              <Route path="raw-materials" element={<RawMaterials />} />
              <Route path="suppliers" element={<Suppliers />} />
              <Route path="purchase-orders" element={<PurchaseOrders />} />

              <Route element={<ProtectedRoute allowedRoles={['manager', 'admin']} />}>
                <Route path="users" element={<Users />} />
                <Route path="settings" element={<Settings />} />
                <Route path="losses" element={<Losses />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
