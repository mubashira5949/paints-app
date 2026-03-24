import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { MainLayout } from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Production from "./pages/Production";
import ProductionDetail from "./pages/ProductionDetail";
import ProductionPackaging from "./pages/ProductionPackaging";
import ProductionRunForm from "./pages/ProductionRunForm";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Recipes from "./pages/Recipes";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />

              <Route path="dashboard" element={<Dashboard />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="recipes" element={<Recipes />} />
              <Route path="production" element={<Production />} />
              <Route path="production/new" element={<ProductionRunForm />} />
              <Route path="production/:batchId" element={<ProductionDetail />} />
              <Route path="production/:batchId/packaging" element={<ProductionPackaging />} />

              {/* Manager and Admin routes */}
              <Route element={<ProtectedRoute allowedRoles={["manager", "admin"]} />}>
                <Route path="users" element={<Users />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
