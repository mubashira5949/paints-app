import { useEffect, useState, useMemo } from 'react'
import { apiRequest } from '../services/api'
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
  MoreHorizontal,
  ChevronDown,
} from 'lucide-react'

interface User {
  id: number
  username: string
  email: string
  role: string
  is_active: boolean
  last_login?: string | null
  created_at: string
}

function getActiveStatus(lastLogin?: string | null) {
  if (!lastLogin) return { text: 'Never logged in', color: 'bg-slate-300' }
  const diff = Date.now() - new Date(lastLogin).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 15) return { text: 'Active now', color: 'bg-green-500' }
  if (minutes < 60) return { text: `Last seen ${minutes}m ago`, color: 'bg-amber-500' }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return { text: `Last seen ${hours}h ago`, color: 'bg-slate-400' }
  const days = Math.floor(hours / 24)
  if (days === 1) return { text: 'Last seen yesterday', color: 'bg-slate-400' }
  return { text: `Last seen ${days}d ago`, color: 'bg-slate-400' }
}

interface UserSummary {
  total_users: string
  managers: string
  operators: string
  sales: string
  client: string
}

interface Role {
  id: number
  name: string
  description: string
}

interface DeviceRequest {
  id: number
  user: string
  device: string
  location: string
  requested_at: string
  status: 'pending' | 'approved' | 'rejected'
}

// Device requests are now fetched from the backend.

export default function Users() {
  const [users, setUsers] = useState<User[]>([])
  const [summary, setSummary] = useState<UserSummary | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [resetTargetUser, setResetTargetUser] = useState<User | null>(null)
  const [userToToggle, setUserToToggle] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAllUsers, setShowAllUsers] = useState(false)
  const [showAllRequests, setShowAllRequests] = useState(false)
  const [deviceRequests, setDeviceRequests] = useState<DeviceRequest[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: 'operator',
    password: '',
    confirmPassword: '',
    is_active: false,
  })
  const [resetPassword, setResetPassword] = useState('')
  const [resetConfirmPassword, setResetConfirmPassword] = useState('')
  const [actionMenuOpenId, setActionMenuOpenId] = useState<number | null>(null)

  const fetchUsers = async () => {
    const data = await apiRequest<User[]>('/users')
    setUsers(data)
  }
  const fetchSummary = async () => {
    const data = await apiRequest<UserSummary>('/users/summary')
    setSummary(data)
  }
  const fetchRoles = async () => {
    const data = await apiRequest<Role[]>('/roles')
    setRoles(data)
  }
  const fetchDeviceRequests = async () => {
    const data = await apiRequest<DeviceRequest[]>('/users/device-requests')
    setDeviceRequests(data)
  }

  useEffect(() => {
    Promise.allSettled([fetchUsers(), fetchSummary(), fetchRoles(), fetchDeviceRequests()]).finally(
      () => setIsLoading(false),
    )
  }, [])

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase()
      const matchSearch =
        !q || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      const matchRole = roleFilter === 'all' || u.role.toLowerCase() === roleFilter
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && u.is_active) ||
        (statusFilter === 'disabled' && !u.is_active)
      return matchSearch && matchRole && matchStatus
    })
  }, [users, searchQuery, roleFilter, statusFilter])

  const handleToggleStatus = async (user: User) => {
    try {
      await apiRequest(`/users/${user.id}`, {
        method: 'PATCH',
        body: { is_active: !user.is_active },
      })
      await Promise.allSettled([fetchUsers(), fetchSummary()])
      setUserToToggle(null)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await apiRequest(`/users/${userId}`, {
        method: 'PATCH',
        body: { role: newRole },
      })
      fetchUsers()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleEditClick = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      role: user.role.toLowerCase(),
      password: '',
      confirmPassword: '',
      is_active: user.is_active,
    })
    setIsModalOpen(true)
  }

  const handleResetPasswordClick = (user: User) => {
    setResetTargetUser(user)
    setResetPassword('')
    setResetConfirmPassword('')
    setIsResetModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser && formData.password !== formData.confirmPassword) {
      alert('Passwords do not match')
      return
    }
    try {
      if (editingUser) {
        await apiRequest(`/users/${editingUser.id}`, {
          method: 'PATCH',
          body: {
            username: formData.username,
            email: formData.email,
            role: formData.role,
            is_active: formData.is_active,
          },
        })
      } else {
        await apiRequest('/users', {
          method: 'POST',
          body: {
            username: formData.username,
            email: formData.email,
            role: formData.role,
            password: formData.password,
          },
        })
      }
      setIsModalOpen(false)
      setEditingUser(null)
      setFormData({
        username: '',
        email: '',
        role: 'operator',
        password: '',
        confirmPassword: '',
        is_active: false,
      })
      await Promise.allSettled([fetchUsers(), fetchSummary(), fetchDeviceRequests()])
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (resetPassword !== resetConfirmPassword) {
      alert('Passwords do not match')
      return
    }
    if (resetPassword.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }
    try {
      await apiRequest(`/users/${resetTargetUser!.id}`, {
        method: 'PATCH',
        body: { password: resetPassword },
      })
      setIsResetModalOpen(false)
      setResetTargetUser(null)
      alert('Password reset successfully!')
    } catch (err: any) {
      alert(err.message)
    }
  }

  const openAddModal = () => {
    setEditingUser(null)
    setFormData({
      username: '',
      email: '',
      role: 'operator',
      password: '',
      confirmPassword: '',
      is_active: false,
    })
    setIsModalOpen(true)
  }

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

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Users</span>
            <UsersIcon className="h-4 w-4 text-blue-500" />
          </div>
          <div className="flex items-end justify-between">
            <div className="text-3xl font-black text-slate-900">{summary?.total_users ?? 0}</div>
            <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md mb-1">+3 this week ↑</div>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Managers</span>
            <ShieldCheck className="h-4 w-4 text-purple-500" />
          </div>
          <div className="flex items-end justify-between">
            <div className="text-3xl font-black text-slate-900">{summary?.managers ?? 0}</div>
            <div className="text-xs font-bold text-slate-400 mb-1">active roles</div>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Operators</span>
            <HardHat className="h-4 w-4 text-sky-500" />
          </div>
          <div className="flex items-end justify-between">
            <div className="text-3xl font-black text-slate-900">{summary?.operators ?? 0}</div>
            <div className="text-xs font-bold text-slate-400 mb-1">active roles</div>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sales</span>
            <BadgeDollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex items-end justify-between">
            <div className="text-3xl font-black text-slate-900">{summary?.sales ?? 0}</div>
            <div className="text-xs font-bold text-slate-400 mb-1">active roles</div>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Clients</span>
            <UsersIcon className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex items-end justify-between">
            <div className="text-3xl font-black text-slate-900">{summary?.client ?? 0}</div>
            <div className="text-xs font-bold text-slate-400 mb-1">active roles</div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        {/* Table toolbar */}
        <div className="p-4 border-b bg-white flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-4 w-full md:w-auto flex-1">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="pl-3 pr-8 py-2.5 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <option value="all">Role: All</option>
                <option value="manager">Manager</option>
                <option value="operator">Operator</option>
                <option value="sales">Sales</option>
                <option value="client">Client</option>
                <option value="admin">Admin</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-3 pr-8 py-2.5 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <option value="all">Status: All</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
            </div>
            {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setRoleFilter('all')
                  setStatusFilter('all')
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2 uppercase tracking-wide"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-slate-500 text-left">
                <th className="px-6 py-3 font-semibold text-[11px] uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 font-semibold text-[11px] uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 font-semibold text-[11px] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 font-semibold text-[11px] uppercase tracking-wider text-right">
                  Actions
                </th>
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
                          {searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
                            ? 'No users match your filters'
                            : 'No users found'}
                        </p>
                        <p className="text-sm text-slate-400 mt-1">
                          {searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
                            ? 'Try adjusting your search or filters.'
                            : 'Create a new user to grant system access.'}
                        </p>
                      </div>
                      {!searchQuery && roleFilter === 'all' && statusFilter === 'all' && (
                        <button
                          onClick={openAddModal}
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                        >
                          <UserPlus className="h-4 w-4" />
                          Add First User
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                (showAllUsers ? filteredUsers : filteredUsers.slice(0, 10)).map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors h-20 border-b border-slate-100 last:border-none">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col justify-center">
                          <div className="font-medium text-gray-900 text-[15px] leading-tight">
                            {user.username}
                          </div>
                          <div className="text-sm text-gray-400 mt-0.5">
                            {user.email}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className={`h-2 w-2 rounded-full ${getActiveStatus(user.last_login).color}`} />
                            <span className="text-[10px] text-slate-500 font-medium">
                              {getActiveStatus(user.last_login).text}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="relative inline-block">
                        <select
                          className="appearance-none bg-blue-50 text-blue-700 font-bold uppercase tracking-wider text-[11px] pl-3 pr-7 py-1.5 rounded-md border border-transparent hover:border-blue-200 cursor-pointer outline-none transition-all"
                          value={user.role.toLowerCase()}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        >
                          <option value="manager">Manager</option>
                          <option value="operator">Operator</option>
                          <option value="sales">Sales</option>
                          <option value="client">Client</option>
                          <option value="admin">Admin</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-600 pointer-events-none" />
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] uppercase tracking-wider font-bold w-fit ${user.is_active ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}
                      >
                        {user.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="relative inline-flex items-center gap-2">
                        <button
                          onClick={() => handleEditClick(user)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors shadow-sm"
                        >
                          <Edit className="h-3.5 w-3.5" /> Edit
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setActionMenuOpenId(actionMenuOpenId === user.id ? null : user.id)}
                            onBlur={() => setTimeout(() => setActionMenuOpenId(null), 150)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                          >
                            <MoreHorizontal className="h-5 w-5" />
                          </button>
                          {actionMenuOpenId === user.id && (
                            <div className="absolute right-0 top-full mt-1 w-40 rounded-xl bg-white shadow-xl border border-slate-100 z-50 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-100">
                              <button
                                onClick={() => handleResetPasswordClick(user)}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                <KeyRound className="h-4 w-4" /> Reset Password
                              </button>
                              <button
                                onClick={() => {
                                  setActionMenuOpenId(null)
                                  if (user.is_active) setUserToToggle(user)
                                  else handleToggleStatus(user)
                                }}
                                className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors border-t border-slate-50 ${
                                  user.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'
                                }`}
                              >
                                {user.is_active ? (
                                  <><UserX className="h-4 w-4" /> Disable User</>
                                ) : (
                                  <><Power className="h-4 w-4" /> Enable User</>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between no-print text-sm">
          <span className="font-medium text-slate-500">
            Showing {Math.min(10, filteredUsers.length)} of {filteredUsers.length} users
          </span>
          {filteredUsers.length > 10 && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowAllUsers(false)} 
                disabled={!showAllUsers}
                className="px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-600 font-semibold disabled:opacity-50 hover:bg-slate-50 transition-colors"
              >
                Prev
              </button>
              <button 
                onClick={() => setShowAllUsers(true)} 
                disabled={showAllUsers}
                className="px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-600 font-semibold disabled:opacity-50 hover:bg-slate-50 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Device Enrollment Requests */}
      <div className="rounded-2xl border-2 border-slate-100 bg-white shadow-lg overflow-hidden mt-12 mb-12 relative">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-amber-50/50 to-white flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 pl-2">
            <div className="p-3 rounded-xl bg-amber-100 text-amber-600 shadow-inner">
              <Monitor className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Device Access Requests</h2>
                {deviceRequests.length > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-red-100 text-red-600 border border-red-200 animate-pulse">
                    Priority: {deviceRequests.length} Pending
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-slate-500 mt-1">
                Approve or reject recent unrecognized device logins
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {deviceRequests.length > 10 && (
              <button
                onClick={() => setShowAllRequests(!showAllRequests)}
                className="text-xs text-amber-700 hover:text-amber-800 font-bold uppercase tracking-wider bg-amber-50 hover:bg-amber-100 px-4 py-2 rounded-lg border border-amber-200 transition-colors"
              >
                {showAllRequests ? 'View Less' : 'View All'}
              </button>
            )}
          </div>
        </div>
        {deviceRequests.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-3 text-center">
            <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <p className="font-medium text-slate-700">No pending requests</p>
            <p className="text-xs text-slate-400">
              All device enrollment requests have been resolved.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-slate-500 text-left">
                  <th className="px-6 py-3 font-semibold text-[11px] uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 font-semibold text-[11px] uppercase tracking-wider">
                    Device
                  </th>
                  <th className="px-6 py-3 font-semibold text-[11px] uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 font-semibold text-[11px] uppercase tracking-wider text-right">
                    Action
                  </th>
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
                        <Monitor className="h-3.5 w-3.5 text-slate-400" />
                        {req.device}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {req.location}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={async () => {
                            try {
                              await apiRequest(`/users/device-requests/${req.id}/approve`, {
                                method: 'POST',
                              })
                              await Promise.allSettled([
                                fetchUsers(),
                                fetchSummary(),
                                fetchDeviceRequests(),
                              ])
                            } catch (err: any) {
                              alert(err.message)
                            }
                          }}
                          className="px-4 py-2 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-colors shadow-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await apiRequest(`/users/device-requests/${req.id}/reject`, {
                                method: 'POST',
                              })
                              await Promise.allSettled([
                                fetchUsers(),
                                fetchSummary(),
                                fetchDeviceRequests(),
                              ])
                            } catch (err: any) {
                              alert(err.message)
                            }
                          }}
                          className="px-4 py-2 rounded-lg bg-white text-red-500 border border-red-300 text-xs font-bold hover:bg-red-50 transition-colors shadow-sm"
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
                <h3 className="text-lg font-bold text-slate-900">
                  {editingUser ? 'Edit User' : 'Add New User'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Enter full name"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Email Address</label>
                <input
                  type="email"
                  required
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Role</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.name.toLowerCase()}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Status</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.is_active ? 'true' : 'false'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_active: e.target.value === 'true',
                      })
                    }
                  >
                    <option value="true">Active</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
              </div>
              {!editingUser && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Password</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Min. 6 characters"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Confirm</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          confirmPassword: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disable Confirmation Modal */}
      {userToToggle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[24px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-6">
                <AlertTriangle className="h-8 w-8 text-red-600" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Are you sure?</h3>
              <p className="text-sm text-slate-500">
                This user (<strong className="text-slate-700">{userToToggle.username}</strong>) will immediately lose access to the system if you disable them.
              </p>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                onClick={() => setUserToToggle(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition-colors"
                onClick={() => handleToggleStatus(userToToggle)}
              >
                Disable
              </button>
            </div>
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
                  <p className="text-xs text-slate-500">
                    For: <span className="font-semibold">{resetTargetUser.username}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleResetSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                  placeholder="Min. 6 characters"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Confirm Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                  placeholder="••••••••"
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
