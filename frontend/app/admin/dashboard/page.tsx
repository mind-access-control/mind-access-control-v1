"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import AdminDashboardContainer from "@/components/admin/AdminDashboardContainer"

export default function AdminDashboardPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/admin-login")
    }
  }, [user, loading, router])

  const handleLogout = async () => {
    try {
      await signOut()
      router.push("/admin-login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Loading...</h2>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <AdminDashboardContainer onLogout={handleLogout} />
} 