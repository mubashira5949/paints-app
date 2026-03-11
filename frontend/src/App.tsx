import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { MainLayout } from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Production from "./pages/Production";
import ProductionRunForm from "./pages/ProductionRunForm";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import Login from "./pages/Login";

function App() {
  return (
    // AuthProvider initializes the user state and provides the JWT context
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Route: The login page sits outside the MainLayout so it occupies the full screen */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes Wrapper: Ensures user is authenticated before hitting MainLayout */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />

              {/* Feature routes available to both managers and workers */}
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="production" element={<Production />} />
              <Route path="production/new" element={<ProductionRunForm />} />
              {/* Feature routes strictly restricted to "manager" role */}
              <Route element={<ProtectedRoute allowedRoles={["manager"]} />}>
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
