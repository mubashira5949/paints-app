import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Production from "./pages/Production";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import Login from "./pages/Login";

function App() {
  return (
    // BrowserRouter provides the routing context for the entire application
    <BrowserRouter>
      {/* Routes is the container for all defined Route components */}
      <Routes>
        {/* Public Route: The login page sits outside the MainLayout so it occupies the full screen */}
        <Route path="/login" element={<Login />} />

        {/* Protected/App Routes Wrapper: MainLayout handles the Sidebar, Topbar, and common UI structure */}
        <Route path="/" element={<MainLayout />}>
          {/* Index Route: Automatically redirects users hitting the root "/" path directly to the Dashboard */}
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* Feature Routes: The following components will render in the Outlet inside MainLayout */}
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="production" element={<Production />} />
          <Route path="users" element={<Users />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
