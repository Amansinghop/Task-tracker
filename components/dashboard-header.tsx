"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw, Clock, Server, LogOut, Settings, Lock, Menu, X, CheckSquare } from "lucide-react"
import Link from "next/link"
import Image from 'next/image';
import { Button } from "@/components/ui/button"
import { ChangePasswordModal } from "@/components/change-password-modal"

interface User {
  id: string
  email: string
  role: "admin" | "user"
  status: "pending" | "approved" | "rejected"
}

export function DashboardHeader() {
  const router = useRouter()
  const [time, setTime] = useState("")
  const [refreshing, setRefreshing] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }
    // When the user clicks inside the iframe, focus moves to the iframe
    // and the parent window fires a 'blur' event. Use this to close the menu.
    const handleWindowBlur = () => {
      setShowUserMenu(false)
      setMobileMenuOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    window.addEventListener("blur", handleWindowBlur)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      window.removeEventListener("blur", handleWindowBlur)
    }
  }, [])

  useEffect(() => {
    // Fetch current user
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/me")
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        }
      } catch (error) {
        console.error("[v0] Failed to fetch user:", error)
      }
    }
    fetchUser()

    // Update time
    const update = () => {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      )
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    window.location.reload()
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/login")
      router.refresh()
    } catch (error) {
      console.error("[v0] Logout failed:", error)
    }
  }

  return (
    <header className="border-b border-border bg-card px-3 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-4">
      <div className="flex items-center justify-between">
        {/* Left: Logo, Title, and Navigation */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 items-center justify-center rounded-md shrink-0">
              <Image 
                src="/qilogo.jpeg" 
                alt="Dl Logo" 
                width={100} 
                height={100}
                className="rounded-lg shadow-lg"
                priority
              />
            </div>
            <div>
              <h1 className="text-sm sm:text-base lg:text-lg font-bold text-foreground tracking-tight">TASK TRACKER</h1>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-4 border-l border-border pl-6">
            <Link 
              href="/" 
              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Monitor
            </Link>
            <Link 
              href="/tasks" 
              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Task Tracker
            </Link>
          </nav>
        </div>

        {/* Right: Desktop controls (hidden on mobile) */}
        <div className="hidden md:flex items-center gap-3 lg:gap-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Server className="h-3.5 w-3.5" />
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Connected
            </span>
          </div>

          <div className="h-4 w-px bg-border" />

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-mono tabular-nums text-foreground">{time}</span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <div className="h-4 w-px bg-border" />

          {/* User Menu (Desktop) */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/50 transition-colors"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {user?.email?.[0].toUpperCase() || "U"}
              </div>
              <span className="hidden lg:inline">{user?.email || "User"}</span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-md border border-border bg-card shadow-lg z-50">
                <div className="border-b border-border px-4 py-2">
                  <p className="text-xs font-medium text-foreground truncate">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {user?.role === "admin" ? "Administrator" : "User"}
                  </p>
                </div>

                <div className="py-1">
                  {user?.role === "admin" && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 px-4 py-2 text-xs text-foreground hover:bg-muted transition-colors"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setShowPasswordModal(true)
                      setShowUserMenu(false)
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-foreground hover:bg-muted transition-colors"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Change Password
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Mobile hamburger (visible only on mobile) */}
        <div className="flex md:hidden items-center gap-2">
          {/* Compact time display on mobile */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span className="font-mono tabular-nums text-foreground text-[10px]">{time}</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-md p-1.5 text-foreground hover:bg-secondary/50 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-border space-y-1">
          {/* User info */}
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
              {user?.email?.[0].toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{user?.email || "User"}</p>
              <p className="text-[10px] text-muted-foreground">
                {user?.role === "admin" ? "Administrator" : "User"}
              </p>
            </div>
          </div>

          <div className="h-px bg-border mx-2" />

          {/* Status */}
          <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
            <Server className="h-3.5 w-3.5 shrink-0" />
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Connected
            </span>
          </div>

          {/* Actions */}
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-2 py-2 text-xs font-medium text-foreground hover:bg-secondary/50 transition-colors rounded-md"
          >
            <Server className="h-3.5 w-3.5 shrink-0" />
            OpsDash Monitor
          </Link>

          <Link
            href="/tasks"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-2 py-2 text-xs font-medium text-foreground hover:bg-secondary/50 transition-colors rounded-md"
          >
            <CheckSquare className="h-3.5 w-3.5 shrink-0" />
            Task Tracker
          </Link>

          <button
            onClick={() => { handleRefresh(); setMobileMenuOpen(false); }}
            disabled={refreshing}
            className="w-full flex items-center gap-2 px-2 py-2 text-xs font-medium text-foreground hover:bg-secondary/50 transition-colors rounded-md disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${refreshing ? "animate-spin" : ""}`} />
            Refresh Page
          </button>

          {user?.role === "admin" && (
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-2 py-2 text-xs text-foreground hover:bg-secondary/50 transition-colors rounded-md"
            >
              <Settings className="h-3.5 w-3.5 shrink-0" />
              Admin Panel
            </Link>
          )}

          <button
            onClick={() => {
              setShowPasswordModal(true)
              setMobileMenuOpen(false)
            }}
            className="w-full flex items-center gap-2 px-2 py-2 text-xs text-foreground hover:bg-secondary/50 transition-colors rounded-md"
          >
            <Lock className="h-3.5 w-3.5 shrink-0" />
            Change Password
          </button>

          <button
            onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
            className="w-full flex items-center gap-2 px-2 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors rounded-md"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            Logout
          </button>
        </div>
      )}

      <ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
    </header>
  )
}
