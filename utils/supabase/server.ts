import { createClient as createBrowserClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create admin client with service role key
export const adminClient = createBrowserClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Access auth admin api
export const adminAuthClient = adminClient.auth.admin

// Regular client for user operations
export const createClient = () => {
  const cookieStore = cookies()
  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: { path: string; maxAge?: number; domain?: string; sameSite?: string; secure?: boolean }) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: { path: string }) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}
