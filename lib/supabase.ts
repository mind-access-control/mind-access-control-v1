import { createClient } from '@supabase/supabase-js';

// Use environment variables for Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
}
if (!supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test connection function
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    console.log('Supabase connection test:', { data, error });
    // Devuelve true si no hay error, lo que indica que la API respondió.
    // Que la sesión sea null es un estado válido si el usuario no está logueado.
    return !error;
  } catch (err) {
    console.error('Supabase connection failed:', err);
    return false;
  }
};

// Utility function to safely clear authentication data
export const clearAuthData = () => {
  // <--- AHORA EXPORTADA
  try {
    // Clear Supabase auth data
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('supabase.auth.expires_at');
    localStorage.removeItem('supabase.auth.refresh_token');

    // Clear any other auth-related items that Supabase might store
    // Supabase stores keys like 'sb-<project-ref>-auth-token'
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if ((key && key.includes('supabase.auth')) || (key && key.startsWith('sb-') && key.includes('-auth-token'))) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
    console.log('Supabase auth data cleared from localStorage.');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};
