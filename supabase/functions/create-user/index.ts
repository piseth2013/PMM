import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CreateUserRequest {
  email: string
  password: string
  full_name: string
  role_id: string
  send_welcome_email?: boolean
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the user is authenticated and has admin permissions
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user has admin permissions
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('admin_users_with_roles')
      .select('role_name, role_permissions')
      .eq('id', user.id)
      .single()

    if (adminError || !adminUser) {
      throw new Error('User is not an admin')
    }

    // Check if user has permission to create users
    const canCreateUsers = adminUser.role_name === 'super_admin' || 
                          adminUser.role_name === 'admin'

    if (!canCreateUsers) {
      throw new Error('Insufficient permissions to create users')
    }

    // Parse request body
    const { email, password, full_name, role_id, send_welcome_email = false }: CreateUserRequest = await req.json()

    // Validate input
    if (!email || !password || !full_name || !role_id) {
      throw new Error('Missing required fields: email, password, full_name, role_id')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format')
    }

    // Validate password strength
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long')
    }

    // Validate role exists and is active
    const { data: role, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('name, is_active')
      .eq('id', role_id)
      .eq('is_active', true)
      .single()

    if (roleError || !role) {
      throw new Error('Invalid or inactive role')
    }

    // Check if admin can assign this role
    if (role.name === 'super_admin' && adminUser.role_name !== 'super_admin') {
      throw new Error('Only super admins can assign super admin role')
    }

    // Check if email already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const emailExists = existingUser.users.some(u => u.email === email)
    
    if (emailExists) {
      throw new Error('Email already exists')
    }

    // Create user in Supabase Auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name
      },
      app_metadata: {
        is_admin: true,
        created_by: user.id
      }
    })

    if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`)
    }

    if (!newUser.user) {
      throw new Error('User creation failed - no user returned')
    }

    // Create admin_users record
    const { error: adminUserError } = await supabaseAdmin
      .from('admin_users')
      .insert({
        id: newUser.user.id,
        email,
        full_name,
        role_id,
        invited_by: user.id,
        created_at: newUser.user.created_at
      })

    if (adminUserError) {
      // If admin_users insert fails, clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      throw new Error(`Failed to create admin user record: ${adminUserError.message}`)
    }

    // Send welcome email if requested
    if (send_welcome_email) {
      try {
        // You can customize this email template or use a third-party service
        await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: {
            full_name,
            welcome_message: true
          }
        })
      } catch (emailError) {
        console.warn('Failed to send welcome email:', emailError)
        // Don't fail the entire operation if email fails
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'User created successfully',
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          full_name,
          role_id,
          created_at: newUser.user.created_at
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error creating user:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})