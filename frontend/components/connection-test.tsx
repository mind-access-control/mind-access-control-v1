"use client"

import { useEffect, useState } from "react"
import { testConnection } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

export function ConnectionTest() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)

  const checkConnection = async () => {
    setLoading(true)
    const connected = await testConnection()
    setIsConnected(connected)
    setLoading(false)
  }

  useEffect(() => {
    checkConnection()
  }, [])

  return (
    <div className="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg border z-50">
      <div className="text-sm font-medium mb-2">Supabase Connection</div>
      <div className="flex items-center gap-2">
        <div
          className={`w-3 h-3 rounded-full ${
            isConnected === null ? "bg-gray-400" : isConnected ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <span className="text-sm">
          {isConnected === null ? "Testing..." : isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>
      <Button onClick={checkConnection} disabled={loading} size="sm" className="mt-2 w-full">
        {loading ? "Testing..." : "Test Again"}
      </Button>
    </div>
  )
}
