import { createClient } from "@supabase/supabase-js"

// Use environment variables for Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test connection function
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.auth.getSession()
    console.log("Supabase connection test:", { data, error })
    return !error
  } catch (err) {
    console.error("Supabase connection failed:", err)
    return false
  }
}
