"use client"

import * as React from "react"

type Theme = "dark" | "light"

const ThemeContext = React.createContext<{
  theme: Theme
  toggle: () => void
} | null>(null)

function getInitialTheme(): Theme {
  // Default light, sama dengan skrip anti-FOUC di app/layout.tsx. Kedua tempat
  // ini WAJIB menyebut tema default yang sama: kalau berbeda, render server
  // dan klien bertengkar dan tema berkedip saat halaman dibuka.
  if (typeof window === "undefined") return "light"
  // Kelas sudah ditetapkan oleh skrip blocking di <head>; ikuti DOM agar
  // tidak terjadi flash (FOUC) atau mismatch dengan localStorage.
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<Theme>(getInitialTheme)

  React.useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", theme === "dark")
    window.localStorage.setItem("jasakite-theme", theme)
  }, [theme])

  const toggle = React.useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"))
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}
