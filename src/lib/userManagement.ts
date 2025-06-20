import { supabase } from './supabase'

export interface CreateUserData {
  email: string
  password: string
  full_name: string
  role_id: string
  send_welcome_email?: boolean
}

export interface CreateUserResponse {
  success: boolean
  message?: string
  user?: {
    id: string
    email: string
    full_name: string
    role_id: string
    created_at: string
  }
  error?: string
}

/**
 * Create a new user account directly (no invitation)
 */
export async function createUserAccount(userData: CreateUserData): Promise<CreateUserResponse> {
  try {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('No active session')
    }

    // Call the edge function to create user
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: userData,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })

    if (error) {
      throw error
    }

    return data
  } catch (error: any) {
    console.error('Error creating user:', error)
    return {
      success: false,
      error: error.message || 'Failed to create user'
    }
  }
}

/**
 * Alternative method using admin client (if you have service role access on frontend)
 * Note: This should only be used in secure environments
 */
export async function createUserWithAdmin(userData: CreateUserData): Promise<CreateUserResponse> {
  try {
    // Validate input
    if (!userData.email || !userData.password || !userData.full_name || !userData.role_id) {
      throw new Error('Missing required fields')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(userData.email)) {
      throw new Error('Invalid email format')
    }

    // Validate password strength
    if (userData.password.length < 6) {
      throw new Error('Password must be at least 6 characters long')
    }

    // Check if email already exists
    const { data: existingUsers } = await supabase
      .from('admin_users')
      .select('email')
      .eq('email', userData.email)

    if (existingUsers && existingUsers.length > 0) {
      throw new Error('Email already exists')
    }

    // Validate role
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('name, is_active')
      .eq('id', userData.role_id)
      .eq('is_active', true)
      .single()

    if (roleError || !role) {
      throw new Error('Invalid or inactive role')
    }

    // Get current user to check permissions
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      throw new Error('No authenticated user')
    }

    // Create user using admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        full_name: userData.full_name
      },
      app_metadata: {
        is_admin: true,
        created_by: currentUser.id
      }
    })

    if (authError) {
      throw new Error(`Failed to create user: ${authError.message}`)
    }

    if (!authData.user) {
      throw new Error('User creation failed')
    }

    // Create admin_users record
    const { error: dbError } = await supabase
      .from('admin_users')
      .insert({
        id: authData.user.id,
        email: userData.email,
        full_name: userData.full_name,
        role_id: userData.role_id,
        invited_by: currentUser.id,
        created_at: authData.user.created_at
      })

    if (dbError) {
      // Clean up auth user if database insert fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw new Error(`Failed to create admin user record: ${dbError.message}`)
    }

    return {
      success: true,
      message: 'User created successfully',
      user: {
        id: authData.user.id,
        email: userData.email,
        full_name: userData.full_name,
        role_id: userData.role_id,
        created_at: authData.user.created_at
      }
    }

  } catch (error: any) {
    console.error('Error creating user with admin:', error)
    return {
      success: false,
      error: error.message || 'Failed to create user'
    }
  }
}

/**
 * Update user information
 */
export async function updateUser(userId: string, updates: {
  email?: string
  full_name?: string
  role_id?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Update auth user if email or full_name changed
    const authUpdates: any = {}
    
    if (updates.email) {
      authUpdates.email = updates.email
    }
    
    if (updates.full_name) {
      authUpdates.user_metadata = { full_name: updates.full_name }
    }

    if (Object.keys(authUpdates).length > 0) {
      const { error: authError } = await supabase.auth.admin.updateUserById(
        userId,
        authUpdates
      )
      if (authError) throw authError
    }

    // Update admin_users table
    const { error: dbError } = await supabase
      .from('admin_users')
      .update({
        ...(updates.email && { email: updates.email }),
        ...(updates.full_name && { full_name: updates.full_name }),
        ...(updates.role_id && { role_id: updates.role_id })
      })
      .eq('id', userId)

    if (dbError) throw dbError

    return { success: true }
  } catch (error: any) {
    console.error('Error updating user:', error)
    return {
      success: false,
      error: error.message || 'Failed to update user'
    }
  }
}

/**
 * Delete user account
 */
export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete from auth (this will trigger deletion from admin_users via trigger)
    const { error: authError } = await supabase.auth.admin.deleteUser(userId)
    if (authError) throw authError

    return { success: true }
  } catch (error: any) {
    console.error('Error deleting user:', error)
    return {
      success: false,
      error: error.message || 'Failed to delete user'
    }
  }
}

/**
 * Reset user password
 */
export async function resetUserPassword(userId: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long')
    }

    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword
    })

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error resetting password:', error)
    return {
      success: false,
      error: error.message || 'Failed to reset password'
    }
  }
}