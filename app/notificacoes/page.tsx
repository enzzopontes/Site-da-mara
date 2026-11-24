"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, CheckCheck, ChevronLeft, Megaphone, RefreshCw } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

interface NotificationReadRecord {
  read_at: string | null
}

interface NotificationItem {
  id: string
  user_id: string | null
  title: string
  body: string
  icon_url: string | null
  link_url: string | null
  read_at: string | null
  created_at: string
  notification_reads?: NotificationReadRecord[] | null
}

type ResolvedLink =
  | { type: "internal"; target: string }
  | { type: "external"; target: string }
  | null

// Formatação relativa idêntica ao App ("agora", "5min", "3h", "21d", "2m", "1a")
function formatRelativeTime(isoDate: string): string {
  const timestamp = new Date(isoDate).getTime()
  if (Number.isNaN(timestamp)) return ""
  const diffMs = Math.max(0, Date.now() - timestamp)
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return "agora"
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}m`
  return `${Math.floor(months / 12)}a`
}

function isNotificationRead(item: NotificationItem): boolean {
  return Boolean(item.read_at || item.notification_reads?.[0]?.read_at)
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isSafeIconUrl(url?: string | null): url is string {
  if (!url) return false
  const trimmed = url.trim()
  if (!trimmed || trimmed.includes("\\") || /[\u0000-\u001f\u007f]/.test(trimmed)) return false
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true
  if (trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed)
      return parsed.protocol === "https:"
    } catch {
      return false
    }
  }
  return false
}

const DEEP_LINK_ROUTE_MAP: Record<string, string> = {
  "": "/",
  home: "/",
  index: "/",
  cardapio: "/cardapio",
  menu: "/cardapio",
  pedidos: "/pedidos",
  orders: "/pedidos",
  cupons: "/cupons",
  coupons: "/cupons",
  perfil: "/perfil",
  profile: "/perfil",
  carrinho: "/carrinho",
  cart: "/carrinho",
  checkout: "/checkout",
  notificacoes: "/notificacoes",
  notifications: "/notificacoes",
  ajuda: "/ajuda",
  help: "/ajuda",
  contato: "/contato",
  "meus-dados": "/meus-dados",
  sobre: "/sobre",
  enderecos: "/selecionar-endereco",
  addresses: "/selecionar-endereco",
}

function resolveNotificationLink(rawUrl?: string | null): ResolvedLink {
  if (!rawUrl) return null
  const trimmed = rawUrl.trim()
  if (!trimmed || trimmed.includes("\\") || /[\u0000-\u001f\u007f]/.test(trimmed)) return null

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return { type: "internal", target: trimmed }
  }

  if (trimmed.startsWith("batatatop://")) {
    const withoutScheme = trimmed.slice("batatatop://".length)
    const [rawPath, rawQuery] = withoutScheme.split("?")
    const normalizedPath = rawPath.replace(/^\/+|\/+$/g, "").toLowerCase()
    const querySuffix = rawQuery ? `?${rawQuery}` : ""

    if (normalizedPath in DEEP_LINK_ROUTE_MAP) {
      return {
        type: "internal",
        target: `${DEEP_LINK_ROUTE_MAP[normalizedPath]}${querySuffix}`,
      }
    }

    // Mapeia subrotas de pedidos (ex: batatatop://pedidos/123)
    const orderMatch = normalizedPath.match(/^(?:pedidos|orders)\/([a-z0-9_-]+)$/i)
    if (orderMatch) {
      return {
        type: "internal",
        target: `/pedidos/${orderMatch[1]}${querySuffix}`,
      }
    }

    // Subrotas de produto redirecionam com segurança para o cardápio
    if (normalizedPath.startsWith("produto/") || normalizedPath.startsWith("product/")) {
      return { type: "internal", target: "/cardapio" }
    }

    return null
  }

  if (trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed)
      if (parsed.protocol === "https:") {
        return { type: "external", target: parsed.toString() }
      }
    } catch {
      return null
    }
  }

  return null
}

function NotificationsListSkeleton() {
  return (
    <div className="divide-y divide-[#F5F2ED]" aria-busy="true" aria-label="Carregando notificações">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="flex items-start gap-3 px-4 py-4 bg-white animate-pulse"
        >
          <div className="w-11 h-11 rounded-full bg-[#ECE7E0] shrink-0" />
          <div className="flex-1 min-w-0 space-y-2 pt-0.5">
            <div className="flex items-center justify-between gap-3">
              <div className="h-3.5 w-3/5 rounded bg-[#ECE7E0]" />
              <div className="h-3 w-10 rounded bg-[#F5F2ED] shrink-0" />
            </div>
            <div className="h-3 w-11/12 rounded bg-[#F5F2ED]" />
            <div className="h-3 w-2/3 rounded bg-[#F5F2ED]" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function NotificacoesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)
  const [brokenIcons, setBrokenIcons] = useState<Record<string, boolean>>({})

  const loadNotifications = useCallback(async () => {
    if (!user?.id) {
      setItems([])
      setError(null)
      setLoading(false)
      return
    }

    if (!UUID_REGEX.test(user.id)) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const supabase = getSupabaseBrowserClient()
      const { data, error: queryError } = await supabase
        .from("notifications")
        .select("*, notification_reads!left(read_at)")
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order("created_at", { ascending: false })

      if (queryError) throw queryError
      setItems((data as NotificationItem[]) || [])
    } catch (err) {
      console.error("[Notificacoes] Erro ao carregar notificações:", err)
      setError("Não foi possível carregar suas notificações.")
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (authLoading) return
    void loadNotifications()
  }, [authLoading, loadNotifications])

  const unreadCount = useMemo(
    () => items.reduce((acc, item) => acc + (isNotificationRead(item) ? 0 : 1), 0),
    [items]
  )

  const handlePress = useCallback(
    async (item: NotificationItem) => {
      if (user?.id && !isNotificationRead(item)) {
        const now = new Date().toISOString()

        setItems((prev) =>
          prev.map((n) =>
            n.id === item.id
              ? { ...n, read_at: now, notification_reads: [{ read_at: now }] }
              : n
          )
        )

        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("notifications-updated"))
        }

        const supabase = getSupabaseBrowserClient()

        supabase
          .from("notification_reads")
          .upsert(
            { user_id: user.id, notification_id: item.id, read_at: now },
            { onConflict: "user_id,notification_id" }
          )
          .then(({ error: upsertError }: { error: unknown }) => {
            if (upsertError) {
              console.warn("[Notificacoes] Erro ao marcar leitura:", upsertError)
            }
          })
          .catch((err: unknown) => {
            console.warn("[Notificacoes] Erro ao marcar leitura:", err)
          })

        if (item.user_id) {
          supabase
            .from("notifications")
            .update({ read_at: now })
            .eq("id", item.id)
            .then(({ error: updateError }: { error: unknown }) => {
              if (updateError) {
                console.warn("[Notificacoes] Erro ao atualizar notificação:", updateError)
              }
            })
            .catch((err: unknown) => {
              console.warn("[Notificacoes] Erro ao atualizar notificação:", err)
            })
        }
      }

      const resolved = resolveNotificationLink(item.link_url)
      if (!resolved) return

      if (resolved.type === "internal") {
        router.push(resolved.target)
      } else if (typeof window !== "undefined") {
        window.open(resolved.target, "_blank", "noopener,noreferrer")
      }
    },
    [router, user?.id]
  )

  const handleMarkAllAsRead = useCallback(async () => {
    if (!user?.id || unreadCount === 0 || markingAll) return

    const unreadItems = items.filter((item) => !isNotificationRead(item))
    if (unreadItems.length === 0) return

    const now = new Date().toISOString()
    setMarkingAll(true)

    setItems((prev) =>
      prev.map((item) =>
        isNotificationRead(item)
          ? item
          : { ...item, read_at: now, notification_reads: [{ read_at: now }] }
      )
    )

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("notifications-updated"))
    }

    try {
      const supabase = getSupabaseBrowserClient()
      const readRows = unreadItems.map((item) => ({
        user_id: user.id,
        notification_id: item.id,
        read_at: now,
      }))

      await supabase
        .from("notification_reads")
        .upsert(readRows, { onConflict: "user_id,notification_id" })

      const userSpecificIds = unreadItems
        .filter((item) => Boolean(item.user_id))
        .map((item) => item.id)

      if (userSpecificIds.length > 0) {
        await supabase
          .from("notifications")
          .update({ read_at: now })
          .in("id", userSpecificIds)
      }
    } catch (err) {
      console.warn("[Notificacoes] Erro ao marcar todas como lidas:", err)
    } finally {
      setMarkingAll(false)
    }
  }, [items, markingAll, unreadCount, user?.id])

  const showSkeleton = authLoading || (Boolean(user) && loading)
  const isGuest = !authLoading && !user

  return (
    <div className="min-h-screen bg-white md:bg-[#F7F4EF] text-[#1F1B16] antialiased">
      <div className="max-w-2xl mx-auto md:py-8 md:px-4">
        <div className="bg-white md:rounded-2xl md:shadow-sm md:border md:border-[#ECE7E0] min-h-screen md:min-h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
          {/* Header fiel ao App (app/notifications.js) */}
          <header className="sticky top-0 z-20 bg-white border-b border-[#F5F2ED]">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined" && window.history.length > 1) {
                    router.back()
                  } else {
                    router.push("/perfil")
                  }
                }}
                aria-label="Voltar"
                className="w-10 h-10 -ml-1.5 flex items-center justify-center rounded-full hover:bg-[#FAF8F5] active:scale-95 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6 text-[#E3A008]" />
              </button>

              <h1 className="flex-1 text-center text-sm font-bold tracking-wide text-[#1F1B16] uppercase">
                NOTIFICAÇÕES
              </h1>

              <div className="w-10 h-10 flex items-center justify-end" aria-hidden="true" />
            </div>

            {!showSkeleton && !isGuest && unreadCount > 0 && (
              <div className="flex items-center justify-between px-4 py-2 bg-[#FDFCFA] border-t border-[#F5F2ED]">
                <span className="text-xs font-medium text-[#6B6157]">
                  {unreadCount === 1
                    ? "1 notificação não lida"
                    : `${unreadCount} notificações não lidas`}
                </span>
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  disabled={markingAll}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E3A008] hover:text-[#B5860A] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Marcar todas como lidas
                </button>
              </div>
            )}
          </header>

          {/* Corpo principal */}
          <main className="flex-1 flex flex-col pb-24 md:pb-8">
            {showSkeleton ? (
              <NotificationsListSkeleton />
            ) : isGuest ? (
              <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
                  <Bell className="w-8 h-8 text-[#E3A008]" />
                </div>
                <p className="text-sm font-medium text-[#6B6157] max-w-xs leading-relaxed">
                  Entre na sua conta para ver suas notificações
                </p>
                <Link
                  href="/login?returnUrl=/notificacoes"
                  className="mt-5 inline-flex items-center justify-center px-7 py-2.5 rounded-xl bg-[#E3A008] hover:bg-[#B5860A] active:scale-[0.98] text-white text-sm font-bold shadow-xs transition-all"
                >
                  Entrar
                </Link>
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
                <Bell className="w-10 h-10 text-[#9C9188]" />
                <p className="mt-3 text-sm text-[#6B6157]">{error}</p>
                <button
                  type="button"
                  onClick={() => void loadNotifications()}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E3A008] hover:bg-[#B5860A] active:scale-[0.98] text-white text-sm font-semibold transition-all cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  Tentar novamente
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
                <Bell className="w-10 h-10 text-[#9C9188]" />
                <p className="mt-3 text-sm text-[#9C9188]">
                  Você ainda não tem notificações
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[#ECE7E0]/70" role="list">
                {items.map((item) => {
                  const isRead = isNotificationRead(item)
                  const showCustomIcon =
                    isSafeIconUrl(item.icon_url) && !brokenIcons[item.id]

                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => void handlePress(item)}
                        className={`w-full flex items-start gap-3 px-4 py-4 text-left transition-colors active:opacity-90 cursor-pointer ${
                          isRead
                            ? "bg-[#FAF8F5] hover:bg-[#F5F2ED]"
                            : "bg-white hover:bg-[#FDFCFA]"
                        }`}
                      >
                        {!isRead && (
                          <span
                            className="w-2 h-2 rounded-full bg-[#E3A008] mt-1.5 shrink-0"
                            aria-label="Não lida"
                          />
                        )}

                        <div className="w-11 h-11 rounded-full overflow-hidden shrink-0">
                          {showCustomIcon ? (
                            <img
                              src={item.icon_url!}
                              alt=""
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={() =>
                                setBrokenIcons((prev) => ({
                                  ...prev,
                                  [item.id]: true,
                                }))
                              }
                            />
                          ) : (
                            <div className="w-full h-full rounded-full bg-amber-50 flex items-center justify-center">
                              <Megaphone className="w-5 h-5 text-[#E3A008]" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm leading-snug ${
                              isRead
                                ? "font-medium text-[#6B6157]"
                                : "font-bold text-[#1F1B16]"
                            }`}
                          >
                            {item.title}
                          </p>
                          {item.body && (
                            <p
                              className={`text-sm mt-1 leading-[19px] ${
                                isRead ? "text-[#9C9188]" : "text-[#6B6157]"
                              }`}
                            >
                              {item.body}
                            </p>
                          )}
                        </div>

                        <span
                          className={`text-[11px] shrink-0 pt-0.5 ${
                            isRead ? "text-[#9C9188]/70" : "text-[#9C9188]"
                          }`}
                        >
                          {formatRelativeTime(item.created_at)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
