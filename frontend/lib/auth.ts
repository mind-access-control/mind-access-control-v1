interface User {
  id: string;
  email: string;
  full_name: string;
  job_title: string;
}

interface SignUpData {
  email: string;
  password: string;
  full_name: string;
  job_title: string;
}

interface SignInData {
  email: string;
  password: string;
}

interface AuthResponse {
  user: User | null;
  error: Error | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Store token in localStorage
const setToken = (token: string) => {
  localStorage.setItem('token', token);
};

// Get token from localStorage
const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

// Remove token from localStorage
const removeToken = () => {
  localStorage.removeItem('token');
};

export const auth = {
  async signUp(data: SignUpData): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to sign up');
      }

      // Store token
      if (result.token) {
        setToken(result.token);
      }

      return { user: result.user, error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  },

  async signIn(data: SignInData): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_URL}/api/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to sign in');
      }

      // Store token
      if (result.token) {
        setToken(result.token);
      }

      return { user: result.user, error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  },

  async signOut(): Promise<{ error: Error | null }> {
    try {
      const response = await fetch(`${API_URL}/api/auth/signout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to sign out');
      }

      // Remove token
      removeToken();

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  },

  async getSession(): Promise<AuthResponse> {
    try {
      const token = getToken();
      
      if (!token) {
        return { user: null, error: new Error('No token found') };
      }

      const response = await fetch(`${API_URL}/api/auth/session`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to get session');
      }

      return { user: result.user, error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  },

  async resetPassword(email: string): Promise<{ error: Error | null }> {
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to reset password');
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  },

  async updatePassword(password: string): Promise<{ error: Error | null }> {
    try {
      const response = await fetch(`${API_URL}/api/auth/update-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update password');
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  },
}; 