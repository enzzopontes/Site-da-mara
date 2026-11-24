"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client"

interface NotificationReadEntry {
  read_at: string | null
}

interface NotificationUnreadRow {
  id: string
  read_at: string | null
  notification_reads?: NotificationReadEntry[] | NotificationReadEntry | null
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function useUnreadNotifications(userId?: string | null) {
  const [unreadCount, setUnreadCount] = useState(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!userId || !UUID_REGEX.test(userId) || !isSupabaseConfigured()) {
      if (mountedRef.current) setUnreadCount(0)
      return
    }

    try {
      const supabase = createBrowserClient()
      const { data, error } = await supabase
        .from("notifications")
        .select("id, read_at, notification_reads!left(read_at)")
        .is("read_at", null)
        .or(`user_id.eq.${userId},user_id.is.null`)

      if (error) {
        if (mountedRef.current) setUnreadCount(0)
        return
      }

      const rows = (data as NotificationUnreadRow[] | null) ?? []
      const count = rows.filter((row) => {
        const readEntry = Array.isArray(row.notification_reads)
          ? row.notification_reads[0]
          : row.notification_reads
        return !row.read_at && !readEntry?.read_at
      }).length

      if (mountedRef.current) {
        setUnreadCount(count)
      }
    } catch {
      if (mountedRef.current) setUnreadCount(0)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0)
      return
    }

    refresh()

    const handleRefresh = () => {
      refresh()
    }

    window.addEventListener("notifications-updated", handleRefresh)
    window.addEventListener("focus", handleRefresh)

    let supabase: ReturnType<typeof createBrowserClient> | null = null
    let channel: ReturnType<ReturnType<typeof createBrowserClient>["channel"]> | null = null

    if (isSupabaseConfigured()) {
      try {
        supabase = createBrowserClient()
        channel = supabase
          .channel(`unread-notifications-${userId}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "notifications" },
            () => {
              refresh()
            }
          )
          .subscribe()
      } catch {
        channel = null
      }
    }

    return () => {
      window.removeEventListener("notifications-updated", handleRefresh)
      window.removeEventListener("focus", handleRefresh)
      if (supabase && channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [userId, refresh])

  return { unreadCount, refresh }
}
