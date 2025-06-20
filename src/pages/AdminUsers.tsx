import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { UsersHeader } from '../components/Users/UsersHeader'
import { UsersStats } from '../components/Users/UsersStats'
import { UsersFilters } from '../components/Users/UsersFilters'
import { UsersList } from '../components/Users/UsersList'
import { AddUserModal } from '../components/Users/AddUserModal'
import { EditUserModal } from '../components/Users/EditUserModal'
import { DeleteUserModal } from '../components/Users/DeleteUserModal'
import { MessageAlert } from '../components/Users/MessageAlert'

interface AdminUser {
  id: string
  email: string
  full_name: string
  invited_by: string | null
  created_at: string
  last_login: string | null
  role_id: string
  role_name?: string
  role_display_name?: string
  role_permissions?: any
  activity_status?: string
  invited_by_name?: string
  invited_by_email?: string
}

interface Role {
  id: string
  name: string
  display_name: string
  description: string | null
  permissions: any
  is_active: boolean
}

interface UserPermissions {
  can_manage_super_admins?: boolean
  can_manage_admins?: boolean
  [key: string]: any
}

export function AdminUsers() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [userPermissions, setUserPermissions] = useState<UserPermissions>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('')
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null)
  
  // Loading states
  const [updatingUser, setUpdatingUser] = useState(false)
  const [deletingUserState, setDeletingUserState] = useState(false)
  
  // Message state
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    setLoading(true)
    await Promise.all([
      loadUsers(),
      loadRoles(),
      loadUserPermissions()
    ])
    setLoading(false)
  }

  const refreshData = async () => {
    setRefreshing(true)
    await Promise.all([
      loadUsers(),
      loadRoles(),
      loadUserPermissions()
    ])
    setRefreshing(false)
    showMessage('success', 'Data refreshed successfully')
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const loadUserPermissions = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_permissions')
      if (error) {
        console.error('Error loading user permissions:', error)
        setUserPermissions({ can_manage_admins: true })
      } else {
        setUserPermissions(data || {})
      }
    } catch (error) {
      console.error('Error loading user permissions:', error)
      setUserPermissions({ can_manage_admins: true })
    }
  }

  const loadRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) {
        console.error('Error loading roles:', error)
        showMessage('error', 'Failed to load roles')
        return
      }
      
      setRoles(data || [])
    } catch (error) {
      console.error('Error loading roles:', error)
      showMessage('error', 'Failed to load roles')
    }
  }

  const loadUsers = async () => {
    try {
      let { data, error } = await supabase
        .from('admin_users_with_roles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading from view:', error)
        
        const { data: usersData, error: usersError } = await supabase
          .from('admin_users')
          .select(`
            *,
            roles:role_id (
              name,
              display_name,
              description,
              permissions,
              is_active
            )
          `)
          .order('created_at', { ascending: false })

        if (usersError) {
          throw usersError
        }

        data = usersData?.map(user => ({
          ...user,
          role_name: user.roles?.name,
          role_display_name: user.roles?.display_name,
          role_description: user.roles?.description,
          role_permissions: user.roles?.permissions,
          role_is_active: user.roles?.is_active,
          activity_status: user.last_login 
            ? (new Date(user.last_login) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) ? 'Active' : 'Inactive')
            : 'Never logged in'
        })) || []
      }

      setUsers(data || [])
      
      if (!data || data.length === 0) {
        await syncAuthUsers()
      }
    } catch (error) {
      console.error('Error loading users:', error)
      showMessage('error', 'Failed to load users')
    }
  }

  const syncAuthUsers = async () => {
    try {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
      
      if (authError) {
        console.error('Cannot access auth users:', authError)
        return
      }

      if (authUsers.users.length > 0) {
        showMessage('success', `Found ${authUsers.users.length} users. Refreshing data...`)
        setTimeout(() => {
          loadUsers()
        }, 1000)
      }
    } catch (error) {
      console.error('Error syncing auth users:', error)
    }
  }

  const handleEditUser = async (userData: { email: string; full_name: string; role_id: string }) => {
    if (!editingUser) return

    setUpdatingUser(true)

    try {
      const authUpdates: any = {}
      
      if (userData.email !== editingUser.email) {
        authUpdates.email = userData.email
      }
      
      if (userData.full_name !== editingUser.full_name) {
        authUpdates.user_metadata = { full_name: userData.full_name }
      }

      if (Object.keys(authUpdates).length > 0) {
        const { error: authError } = await supabase.auth.admin.updateUserById(
          editingUser.id,
          authUpdates
        )
        if (authError) throw authError
      }

      const { error: dbError } = await supabase
        .from('admin_users')
        .update({
          email: userData.email,
          full_name: userData.full_name,
          role_id: userData.role_id
        })
        .eq('id', editingUser.id)

      if (dbError) throw dbError

      showMessage('success', `User "${userData.full_name}" has been updated successfully`)
      setShowEditModal(false)
      setEditingUser(null)
      loadUsers()
    } catch (error: any) {
      console.error('Error updating user:', error)
      showMessage('error', error.message || 'Failed to update user')
    } finally {
      setUpdatingUser(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!deletingUser) return

    setDeletingUserState(true)

    try {
      const { error: authError } = await supabase.auth.admin.deleteUser(deletingUser.id)
      if (authError) throw authError

      showMessage('success', `User "${deletingUser.full_name}" has been deleted successfully`)
      setShowDeleteModal(false)
      setDeletingUser(null)
      loadUsers()
    } catch (error: any) {
      console.error('Error deleting user:', error)
      showMessage('error', error.message || 'Failed to delete user')
    } finally {
      setDeletingUserState(false)
    }
  }

  const openEditModal = (user: AdminUser) => {
    setEditingUser(user)
    setShowEditModal(true)
  }

  const openDeleteModal = (user: AdminUser) => {
    setDeletingUser(user)
    setShowDeleteModal(true)
  }

  const canManageUser = (user: AdminUser) => {
    if (userPermissions.can_manage_super_admins) return true
    if (userPermissions.can_manage_admins && user.role_name !== 'super_admin') return true
    return false
  }

  const getAvailableRoles = () => {
    if (userPermissions.can_manage_super_admins) {
      return roles
    }
    return roles.filter(role => role.name !== 'super_admin')
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = selectedRole === '' || user.role_id === selectedRole
    return matchesSearch && matchesRole
  })

  const handleAddUserSuccess = () => {
    loadUsers()
    showMessage('success', 'User created successfully')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <UsersHeader
        onAddUser={() => setShowAddModal(true)}
        onRefresh={refreshData}
        refreshing={refreshing}
      />

      {/* Stats */}
      <UsersStats users={users} />

      {/* Message */}
      <MessageAlert 
        message={message} 
        onClose={() => setMessage(null)} 
      />

      {/* Filters */}
      <UsersFilters
        searchTerm={searchTerm}
        selectedRole={selectedRole}
        roles={roles}
        onSearchChange={setSearchTerm}
        onRoleChange={setSelectedRole}
      />

      {/* Users List */}
      <UsersList
        users={filteredUsers}
        currentUserId={currentUser?.id}
        onEditUser={openEditModal}
        onDeleteUser={openDeleteModal}
        canManageUser={canManageUser}
      />

      {/* Modals */}
      <AddUserModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddUserSuccess}
        availableRoles={getAvailableRoles()}
      />

      <EditUserModal
        isOpen={showEditModal}
        user={editingUser}
        availableRoles={getAvailableRoles()}
        onClose={() => {
          setShowEditModal(false)
          setEditingUser(null)
        }}
        onSave={handleEditUser}
        loading={updatingUser}
      />

      <DeleteUserModal
        isOpen={showDeleteModal}
        user={deletingUser}
        onClose={() => {
          setShowDeleteModal(false)
          setDeletingUser(null)
        }}
        onConfirm={handleDeleteUser}
        loading={deletingUserState}
      />
    </div>
  )
}