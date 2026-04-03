import { useEffect, useState, useMemo } from "react";
import { apiRequest } from "../services/api";
import {
  Users as UsersIcon,
  UserPlus,
  ShieldCheck,
  HardHat,
  BadgeDollarSign,
  Edit,
  X,
  CheckCircle2,
  XCircle,
  Mail,
  Power,
  KeyRound,
  Search,
  Monitor,
  MapPin,
  AlertTriangle,
  UserX,
} from "lucide-react";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface UserSummary {
  total_users: string;
  managers: string;
  operators: string;
  sales: string;
  client: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
}

interface DeviceRequest {
  id: number;
  user: string;
  device: string;
  location: string;
  requested_at: string;
  status: "pending" | "approved" | "rejected";
}

// Device requests are now fetched from the backend.

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [summary, setSummary] = useState<UserSummary | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetTargetUser, setResetTargetUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [showAllRequests, setShowAllRequests] = useState(false);
  const [deviceRequests, setDeviceRequests] = useState<DeviceRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    role: "operator",
    password: "",
    confirmPassword: "",
    is_active: false,
  });
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");

  const fetchUsers = async () => {
    const data = await apiRequest<User[]>("/users");
    setUsers(data);
  };
  const fetchSummary = async () => {
    const data = await apiRequest<UserSummary>("/users/summary");
    setSummary(data);
  };
  const fetchRoles = async () => {
    const data = await apiRequest<Role[]>("/roles");
    setRoles(data);
  };
  const fetchDeviceRequests = async () => {
    const data = await apiRequest<DeviceRequest[]>("/users/device-requests");
    setDeviceRequests(data);
  };

  useEffect(() => {
    setIsLoading(true);
    Promise.allSettled([fetchUsers(), fetchSummary(), fetchRoles(), fetchDeviceRequests()]).finally(() =>
      setIsLoading(false)
    );
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRole = roleFilter === "all" || u.role.toLowerCase() === roleFilter;
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && u.is_active) ||
        (statusFilter === "disabled" && !u.is_active);
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const handleToggleStatus = async (user: User) => {
    try {
      await apiRequest(`/users/${user.id}`, { method: "PATCH", body: { is_active: !user.is_active } });
      await Promise.allSettled([fetchUsers(), fetchSummary()]);
    } catch (err: any) { alert(err.message); }
  };

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setFormData({ username: user.username, email: user.email, role: user.role.toLowerCase(), password: "", confirmPassword: "", is_active: user.is_active });
    setIsModalOpen(true);
  };

  const handleResetPasswordClick = (user: User) => {
    setResetTargetUser(user);
    setResetPassword("");
    setResetConfirmPassword("");
    setIsResetModalOpen(true);
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser && formData.password !== formData.confirmPassword) { alert("Passwords do not match"); return; }
    try {
      if (editingUser) {
        await apiRequest(`/users/${editingUser.id}`, { method: "PATCH", body: { username: formData.username, email: formData.email, role: formData.role, is_active: formData.is_active } });
      } else {
        await apiRequest("/users", { method: "POST", body: { username: formData.username, email: formData.email, role: formData.role, password: formData.password } });
      }
      setIsModalOpen(false);
      setEditingUser(null);
      setFormData({ username: "", email: "", role: "operator", password: "", confirmPassword: "", is_active: false });
      await Promise.allSettled([fetchUsers(), fetchSummary(), fetchDeviceRequests()]);
    } catch (err: any) { alert(err.message); }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetPassword !== resetConfirmPassword) { alert("Passwords do not match"); return; }
    if (resetPassword.length < 6) { alert("Password must be at least 6 characters"); return; }
    try {
      await apiRequest(`/users/${resetTargetUser!.id}`, { method: "PATCH", body: { password: resetPassword } });
      setIsResetModalOpen(false);
      setResetTargetUser(null);
      alert("Password reset successfully!");
    } catch (err: any) { alert(err.message); }
  };

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({ username: "", email: "", role: "operator", password: "", confirmPassword: "", is_active: false });
    setIsModalOpen(true);
  };

  const getRoleBadge = (role: string) => {
    switch (role.toLowerCase()) {
      case "manager": return "bg-purple-100 text-purple-700 border-purple-200";
      case "operator": return "bg-blue-100 text-blue-700 border-blue-200";
      case "sales": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "client": return "bg-amber-100 text-amber-700 border-amber-200";
      case "admin": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };



  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <UsersIcon className="h-8 w-8 text-blue-600" />
            User Management
          </h1>
          <p className="text-slate-500 mt-1">Manage system users, roles, and access levels.</p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Add New User
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 border border-red-200 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-800 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
        <div className="rounded-2xl border border-t-4 border-t-blue-500 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Users</span>
            <UsersIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-slate-900">{summary?.total_users ?? 0}</div>
        </div>
        <div className="rounded-2xl border border-t-4 border-t-purple-500 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Managers</span>
            <ShieldCheck className="h-5 w-5 text-purple-400" />
          </div>
          <div className="text-3xl font-bold text-slate-900">{summary?.managers ?? 0}</div>
        </div>
        <div className="rounded-2xl border border-t-4 border-t-sky-500 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Operators</span>
            <HardHat className="h-5 w-5 text-sky-400" />
          </div>
          <div className="text-3xl font-bold text-slate-900">{summary?.operators ?? 0}</div>
        </div>
        <div className="rounded-2xl border border-t-4 border-t-emerald-500 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sales</span>
            <BadgeDollarSign className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-slate-900">{summary?.sales ?? 0}</div>
        </div>
        <div className="rounded-2xl border border-t-4 border-t-amber-500 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Clients</span>
            <UsersIcon className="h-5 w-5 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-slate-900">{summary?.client ?? 0}</div>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        {/* Table toolbar */}
        <div className="p-5 border-b bg-slate-50 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <h2 className="text-base font-bold text-slate-800">System Users</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {showAllUsers ? `Showing all ${filteredUsers.length}` : `Showing ${Math.min(10, filteredUsers.length)} of ${filteredUsers.length}`}
                </span>
                {filteredUsers.length > 10 && (
                  <button 
                    onClick={() => setShowAllUsers(!showAllUsers)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-bold uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-100"
                  >
                    {showAllUsers ? 'View Less' : 'View All'}
                  </button>
                )}
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-64"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase">Role:</span>
            {["all", "manager", "operator", "sales", "client", "admin"].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${roleFilter === r ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}
              >
                {r === "all" ? "All" : r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
            <span className="text-slate-300 mx-1">|</span>
            <span className="text-xs font-semibold text-slate-400 uppercase">Status:</span>
            {["all", "active", "disabled"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${statusFilter === s ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-slate-500 text-left">
                <th className="px-6 py-3 font-semibold text-[11px] uppercase tracking-wider">User</th>
                <th className="px-6 py-3 font-semibold text-[11px] uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 font-semibold text-[11px] uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 font-semibold text-[11px] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                      <p className="text-slate-500">Loading users...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
                        <UsersIcon className="h-8 w-8 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-700">
                          {searchQuery || roleFilter !== "all" || statusFilter !== "all" ? "No users match your filters" : "No users found"}
                        </p>
                        <p className="text-sm text-slate-400 mt-1">
                          {searchQuery || roleFilter !== "all" || statusFilter !== "all" ? "Try adjusting your search or filters." : "Create a new user to grant system access."}
                        </p>
                      </div>
                      {!searchQuery && roleFilter === "all" && statusFilter === "all" && (
                        <button onClick={openAddModal} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                          <UserPlus className="h-4 w-4" />
                          Add First User
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                (showAllUsers ? filteredUsers : filteredUsers.slice(0, 10)).map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">{user.username}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3" />{user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold border ${getRoleBadge(user.role)}`}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold ${user.is_active ? "text-emerald-700 bg-emerald-50" : "text-slate-500 bg-slate-100"}`}>
                        {user.is_active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        {user.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end items-center gap-1.5">
                        <button onClick={() => handleEditClick(user)} title="Edit" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 transition-colors">
                          <Edit className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button onClick={() => handleResetPasswordClick(user)} title="Reset Password" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-100 transition-colors">
                          <KeyRound className="h-3.5 w-3.5" /> Reset
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${user.is_active ? "text-orange-700 bg-orange-50 hover:bg-orange-100 border-orange-100" : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-100"}`}
                        >
                          {user.is_active ? <><UserX className="h-3.5 w-3.5" /> Disable</> : <><Power className="h-3.5 w-3.5" /> Enable</>}
                        </button>

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Device Enrollment Requests */}
      <div className="rounded-xl border bg-white shadow-sm hover:bg-gray-50 transition-colors overflow-hidden">
        <div className="p-5 border-b bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Monitor className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Device Enrollment Requests</h2>
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-500">Approve or reject new device login requests</p>
                <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                  {showAllRequests ? `Showing all ${deviceRequests.length}` : `Showing ${Math.min(10, deviceRequests.length)} of ${deviceRequests.length}`}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {deviceRequests.length > 10 && (
              <button 
                onClick={() => setShowAllRequests(!showAllRequests)}
                className="text-xs text-amber-600 hover:text-amber-700 font-bold uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded border border-amber-100"
              >
                {showAllRequests ? 'View Less' : 'View All'}
              </button>
            )}
            {deviceRequests.length > 0 && (
              <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                {deviceRequests.length} Pending
              </span>
            )}
          </div>
        </div>
        {deviceRequests.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-3 text-center">
            <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <p className="font-medium text-slate-700">No pending requests</p>
            <p className="text-xs text-slate-400">All device enrollment requests have been resolved.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-slate-500 text-left">
                  <th className="px-6 py-3 font-semibold text-[11px] uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 font-semibold text-[11px] uppercase tracking-wider">Device</th>
                  <th className="px-6 py-3 font-semibold text-[11px] uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 font-semibold text-[11px] uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(showAllRequests ? deviceRequests : deviceRequests.slice(0, 10)).map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-bold text-xs">
                          {req.user.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-800 text-sm">{req.user}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Monitor className="h-3.5 w-3.5 text-slate-400" />{req.device}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />{req.location}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={async () => {
                            try {
                              await apiRequest(`/users/device-requests/${req.id}/approve`, { method: "POST" });
                              await Promise.allSettled([fetchUsers(), fetchSummary(), fetchDeviceRequests()]);
                            } catch (err: any) { alert(err.message); }
                          }} 
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={async () => {
                            try {
                              await apiRequest(`/users/device-requests/${req.id}/reject`, { method: "POST" });
                              await Promise.allSettled([fetchUsers(), fetchSummary(), fetchDeviceRequests()]);
                            } catch (err: any) { alert(err.message); }
                          }} 
                          className="px-3 py-1.5 rounded-lg bg-white text-red-700 border border-red-100 text-xs font-semibold hover:bg-red-50 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl border overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  {editingUser ? <Edit className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                </div>
                <h3 className="text-lg font-bold text-slate-900">{editingUser ? "Edit User" : "Add New User"}</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Full Name</label>
                <input type="text" required className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter full name" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Email Address</label>
                <input type="email" required className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="name@company.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Role</label>
                  <select className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                    {roles.map((r) => <option key={r.id} value={r.name.toLowerCase()}>{r.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Status</label>
                  <select className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.is_active ? "true" : "false"} onChange={(e) => setFormData({ ...formData, is_active: e.target.value === "true" })}>
                    <option value="true">Active</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
              </div>
              {!editingUser && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Password</label>
                    <input type="password" required minLength={6} className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Min. 6 characters" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Confirm</label>
                    <input type="password" required minLength={6} className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="••••••••" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} />
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                  {editingUser ? "Update User" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetModalOpen && resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl border overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b bg-amber-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Reset Password</h3>
                  <p className="text-xs text-slate-500">For: <span className="font-semibold">{resetTargetUser.username}</span></p>
                </div>
              </div>
              <button onClick={() => setIsResetModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleResetSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">New Password</label>
                <input type="password" required minLength={6} className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 outline-none" placeholder="Min. 6 characters" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Confirm Password</label>
                <input type="password" required minLength={6} className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 outline-none" placeholder="••••••••" value={resetConfirmPassword} onChange={(e) => setResetConfirmPassword(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-2 border-t">
                <button type="button" onClick={() => setIsResetModalOpen(false)} className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors">
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
