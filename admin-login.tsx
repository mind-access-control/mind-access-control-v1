"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { ConnectionTest } from "@/components/connection-test";
import { Eye, EyeOff } from "lucide-react";
import AdminDashboard from "@/components/admin-dashboard";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error } = await signIn(email, password);

      if (error) {
        // Manejar el error de rol específico
        if (
          error.message.includes(
            "Access Denied: Only administrators are allowed to log in."
          )
        ) {
          setError(
            "Access Denied: You do not have administrator privileges. Please contact support."
          );
        } else {
          // Otros errores de autenticación (ej. credenciales incorrectas)
          setError(error.message);
        }
      } else if (data && data.user) {
        // Asegurarse de que 'data' no sea null
        setSuccess(`Welcome back, ${data.user.email}! Login successful.`);
        console.log("Login successful:", data.user);
        // Redirigir al dashboard
        setTimeout(() => {
          setIsLoggedIn(true);
        }, 1500);
      } else {
        // En caso de que no haya error pero tampoco data.user (inesperado)
        setError("Login failed. Please try again.");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setEmail("");
    setPassword("");
    setError(null);
    setSuccess(null);
  };

  if (isLoggedIn) {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex flex-col items-center justify-center p-4">
      <ConnectionTest />
      {/* Main Login Card */}
      <Card className="w-full max-w-md bg-white shadow-2xl border-0">
        <CardHeader className="text-center pb-2">
          {/* Brand Logo Placeholder */}
          <div className="mx-auto mb-6 w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
            <div className="w-8 h-8 bg-white rounded-lg opacity-90"></div>
          </div>

          {/* Main Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to Access Control System
          </h1>

          {/* Subtitle */}
          <p className="text-sm text-gray-600">By Admin Group</p>
        </CardHeader>

        <CardContent className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-gray-700"
              >
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-50 border-0 rounded-lg h-12 px-4 text-gray-900 placeholder-gray-500 focus:bg-slate-100 focus:ring-2 focus:ring-teal-500 focus:ring-offset-0"
                placeholder="Enter your email address"
                required
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-gray-700"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-50 border-0 rounded-lg h-12 px-4 pr-12 text-gray-900 placeholder-gray-500 focus:bg-slate-100 focus:ring-2 focus:ring-teal-500 focus:ring-offset-0"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}
            {success && (
              <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                {success}
              </div>
            )}

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-sm text-teal-600 hover:text-teal-700 transition-colors"
              >
                Forgot your password?
              </Link>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium h-12 rounded-lg transition-colors focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isLoading ? "Signing in..." : "Log in"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Additional Text Below Form */}
      <div className="mt-6 text-center">
        <p className="text-sm text-indigo-200">
          Not an admin?{" "}
          <Link
            href="/contact-support"
            className="text-teal-300 hover:text-teal-200 underline transition-colors"
          >
            Contact Support
          </Link>
        </p>
      </div>

      {/* Page Footer */}
      <footer className="mt-auto pt-8 pb-4 text-center">
        <p className="text-xs text-indigo-300 mb-2">
          Powered by Facial Recognition System | 2025
        </p>
        {/* Optional logo placeholders */}
        <div className="flex justify-center space-x-4 opacity-60">
          <div className="w-6 h-6 bg-indigo-400 rounded-full"></div>
          <div className="w-6 h-6 bg-purple-400 rounded-full"></div>
          <div className="w-6 h-6 bg-teal-400 rounded-full"></div>
        </div>
      </footer>
    </div>
  );
}
