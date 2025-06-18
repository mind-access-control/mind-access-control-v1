"use client"

import { useState, useEffect } from "react"
import { auth } from "@/lib/auth"

interface User {
  id: string;
  email: string;
  full_name: string;
  job_title: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    try {
      const { user, error } = await auth.getSession()
      if (error) throw error
      setUser(user)
    } catch (error) {
      console.error('Error checking user session:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const result = await auth.signIn({ email, password })
      if (result.error) throw result.error
      setUser(result.user)
      return result
    } catch (error) {
      console.error('Error signing in:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      const { error } = await auth.signOut()
      if (error) throw error
      setUser(null)
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  return {
    user,
    loading,
    signIn,
    signOut,
  }
}
