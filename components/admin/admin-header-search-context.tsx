"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { usePathname } from "next/navigation"

export interface AdminHeaderSearchConfig {
  placeholder: string
  ariaLabel?: string
}

interface RegisteredSearch extends AdminHeaderSearchConfig {
  id: string
}

interface AdminHeaderSearchContextValue {
  config: RegisteredSearch | null
  query: string
  setQuery: (value: string) => void
  register: (entry: RegisteredSearch) => void
  unregister: (id: string) => void
}

const AdminHeaderSearchContext = createContext<AdminHeaderSearchContextValue | null>(null)

export function AdminHeaderSearchProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [config, setConfig] = useState<RegisteredSearch | null>(null)
  const [query, setQuery] = useState("")

  // Limpa a busca automaticamente ao navegar entre telas do painel admin
  useEffect(() => {
    setQuery("")
  }, [pathname])

  const register = useCallback((entry: RegisteredSearch) => {
    setConfig((prev) => {
      if (
        prev &&
        prev.id === entry.id &&
        prev.placeholder === entry.placeholder &&
        prev.ariaLabel === entry.ariaLabel
      ) {
        return prev
      }
      return entry
    })
  }, [])

  const unregister = useCallback((id: string) => {
    setConfig((prev) => (prev?.id === id ? null : prev))
  }, [])

  const value = useMemo(
    () => ({ config, query, setQuery, register, unregister }),
    [config, query, register, unregister]
  )

  return (
    <AdminHeaderSearchContext.Provider value={value}>
      {children}
    </AdminHeaderSearchContext.Provider>
  )
}

export function useAdminHeaderSearchState() {
  const ctx = useContext(AdminHeaderSearchContext)
  if (!ctx) {
    throw new Error("useAdminHeaderSearchState must be used within AdminHeaderSearchProvider")
  }
  return ctx
}

export function useAdminHeaderSearch(options: AdminHeaderSearchConfig) {
  const ctx = useContext(AdminHeaderSearchContext)
  const id = useId()
  const { placeholder, ariaLabel } = options
  const register = ctx?.register
  const unregister = ctx?.unregister

  useEffect(() => {
    if (!register || !unregister) return
    register({ id, placeholder, ariaLabel })
    return () => {
      unregister(id)
    }
  }, [id, placeholder, ariaLabel, register, unregister])

  return {
    query: ctx?.query ?? "",
    setQuery: ctx?.setQuery ?? (() => {}),
  }
}
