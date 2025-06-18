"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

export function ConnectionTest() {
  const [isTesting, setIsTesting] = useState(false)
  const [results, setResults] = useState<{
    backend: boolean | null
    database: boolean | null
    supabase: boolean | null
  }>({
    backend: null,
    database: null,
    supabase: null
  })

  const testConnections = async () => {
    setIsTesting(true)
    setResults({
      backend: null,
      database: null,
      supabase: null
    })

    try {
      // Test backend connection
      const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/health`)
      const backendOk = backendResponse.ok

      // Test database connection (via backend)
      const dbResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/users`)
      const dbOk = dbResponse.status !== 500

      // Test Supabase connection
      const supabaseResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`
        }
      })
      const supabaseOk = supabaseResponse.status !== 401

      setResults({
        backend: backendOk,
        database: dbOk,
        supabase: supabaseOk
      })
    } catch (error) {
      console.error('Connection test failed:', error)
      setResults({
        backend: false,
        database: false,
        supabase: false
      })
    } finally {
      setIsTesting(false)
    }
  }

  const getStatusIcon = (status: boolean | null) => {
    if (status === null) return null
    return status ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    )
  }

  const getStatusBadge = (status: boolean | null, label: string) => {
    if (status === null) {
      return <Badge variant="secondary">Not Tested</Badge>
    }
    return status ? (
      <Badge variant="default" className="bg-green-500">Connected</Badge>
    ) : (
      <Badge variant="destructive">Failed</Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Connection Test
          {isTesting && <Loader2 className="w-4 h-4 animate-spin" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              {getStatusIcon(results.backend)}
              Backend API
            </span>
            {getStatusBadge(results.backend, "Backend")}
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              {getStatusIcon(results.database)}
              Database
            </span>
            {getStatusBadge(results.database, "Database")}
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              {getStatusIcon(results.supabase)}
              Supabase
            </span>
            {getStatusBadge(results.supabase, "Supabase")}
          </div>
        </div>
        <Button 
          onClick={testConnections} 
          disabled={isTesting}
          className="w-full"
        >
          {isTesting ? "Testing..." : "Test Connections"}
        </Button>
      </CardContent>
    </Card>
  )
} 