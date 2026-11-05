"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { PerfilSkeleton } from "@/components/skeletons/perfil-skeleton"
import { Skeleton } from "@/components/ui/skeleton"
import { AddressCardSkeleton } from "@/components/skeletons/address-skeleton"
import Link from "next/link"
import { HeaderWrapper } from "@/components/header-wrapper"
import { Footer } from "@/components/footer"
import { OrderSummary } from "@/components/order-summary"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { addressesManager, type Address } from "@/lib/addresses-manager"
import { couponsManager, type Coupon } from "@/lib/cupons-manager"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import {
  User,
  Mail,
  Phone,
  MapPin,
  Plus,
  Trash2,
  ShieldAlert,
  LogOut,
  ChevronRight,
  ChevronDown,
  Settings,
  HelpCircle,
  Lock,
  Gift,
  Ticket,
  Sparkles,
  Copy,
  Check,
  Bell,
  FileText,
  MessageCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
  WifiOff,
  Award,
  CreditCard,
} from "lucide-react"

const ADMIN_EMAILS = ["enzzobaraldo2008@gmail.com", "maraysis9010@gmail.com"]

function getInitials(nameOrEmail?: string | null): string {
  if (!nameOrEmail) return "BT"
  const cleaned = nameOrEmail.trim()
  if (!cleaned) return "BT"
  const parts = cleaned.split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return cleaned.slice(0, 2).toUpperCase()
}

export interface AccordionSubItem {
  label: string
  badge?: string | number
  onPress?: () => void
  danger?: boolean
  disabled?: boolean
  customContent?: React.ReactNode
  isExpandedContent?: boolean
}

interface ProfileAccordionItemProps {
  icon: React.ReactNode
  title: string
  subtitle?: string
  items: AccordionSubItem[]
  expanded?: boolean
  onToggle?: () => void
}

function ProfileAccordionItem({
  icon,
  title,
  subtitle,
  items,
  expanded: controlledExpanded,
  onToggle,
}: ProfileAccordionItemProps) {
  const [internalExpanded, setInternalExpanded] = useState(false)
  const isExpanded =
    controlledExpanded !== undefined ? controlledExpanded : internalExpanded

  const handleToggle = () => {
    if (onToggle) {
      onToggle()
    } else {
      setInternalExpanded((prev) => !prev)
    }
  }

  return (
    <div className="border-b border-[#ECE7E0] last:border-b-0">
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between py-4 px-1 text-left cursor-pointer active:scale-[0.98] transition-transform group"
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
          <div className="w-6 flex items-center justify-center text-[#717171] shrink-0">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`text-[15px] text-[#1A1A1A] truncate transition-all ${
                isExpanded ? "font-bold" : "font-medium"
              }`}
            >
              {title}
            </p>
            {!isExpanded && subtitle && (
              <p className="text-xs text-[#717171] truncate mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-[#717171] shrink-0 transition-transform duration-200 ${
            isExpanded ? "rotate-180 text-[#1A1A1A]" : ""
          }`}
        />
      </button>

      {isExpanded && (
        <div className="pl-9 pr-1 pb-3 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
          {items.map((item, idx) => (
            <div key={item.label + idx}>
              <button
                type="button"
                disabled={item.disabled}
                onClick={item.disabled ? undefined : item.onPress}
                className={`w-full flex items-center justify-between py-3 px-2 rounded-xl text-left transition-all ${
                  item.disabled
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer hover:bg-[#F7F5F0] active:scale-[0.98]"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`text-sm truncate ${
                      item.danger
                        ? "text-[#E63535] font-semibold"
                        : "text-[#1A1A1A] font-medium"
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.badge !== undefined && (
                    <span className="inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-bold rounded-full bg-[#FEF8EC] text-[#A16207] border border-[#E3A008]/40">
                      {item.badge}
                    </span>
                  )}
                </div>
                {!item.disabled && (
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 transition-transform ${
                      item.isExpandedContent ? "rotate-90" : ""
                    } ${item.danger ? "text-[#E63535]" : "text-[#717171]"}`}
                  />
                )}
              </button>

              {item.isExpandedContent && item.customContent && (
                <div className="mt-1 mb-3 pl-2 pr-1 animate-in fade-in duration-150">
                  {item.customContent}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProfileSkeleton() {
  return <PerfilSkeleton />
}

export default function PerfilPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()

  // Toast & Offline state
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState(false)

  // Admin & Profile Metadata
  const [isAdmin, setIsAdmin] = useState(false)
  const [profilePhone, setProfilePhone] = useState("")
  const [profileCpf, setProfileCpf] = useState("")
  const [profileName, setProfileName] = useState("")
  const [ordersCount, setOrdersCount] = useState<number>(0)

  // Coupons state
  const [activeCoupons, setActiveCoupons] = useState<Coupon[]>([])
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Addresses state
  const [addresses, setAddresses] = useState<Address[]>([])
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [newAddress, setNewAddress] = useState({
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "Iacanga",
    state: "SP",
    cep: "",
  })

  // Accordion & Inline Panels control
  const [openAccordion, setOpenAccordion] = useState<string | null>(null)
  const [activeSubPanel, setActiveSubPanel] = useState<string | null>(null)

  // Personal Data Inline Edit
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileFeedback, setProfileFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  // Notification Preferences
  const [notifOrders, setNotifOrders] = useState(true)
  const [notifPromos, setNotifPromos] = useState(true)

  // Modals: Logout & LGPD Delete
  const [logoutModalOpen, setLogoutModalOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [confirmDeleteWord, setConfirmDeleteWord] = useState("")
  const [deleteReason, setDeleteReason] = useState("")
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [deleteProtocol, setDeleteProtocol] = useState<string | null>(null)
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current))
    }, 3200)
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine)
      const handleOnline = () => setIsOffline(false)
      const handleOffline = () => setIsOffline(true)
      window.addEventListener("online", handleOnline)
      window.addEventListener("offline", handleOffline)

      try {
        const savedOrdersNotif = localStorage.getItem("bt_notif_orders")
        const savedPromosNotif = localStorage.getItem("bt_notif_promos")
        if (savedOrdersNotif !== null) setNotifOrders(savedOrdersNotif === "true")
        if (savedPromosNotif !== null) setNotifPromos(savedPromosNotif === "true")
      } catch {}

      return () => {
        window.removeEventListener("online", handleOnline)
        window.removeEventListener("offline", handleOffline)
      }
    }
  }, [])

  // Load coupons (available for logged-in view)
  useEffect(() => {
    let mounted = true
    const fetchCoupons = async () => {
      setIsLoadingCoupons(true)
      try {
        const supabase = getSupabaseBrowserClient()
        const { data, error } = await supabase
          .from("coupons")
          .select("*")
          .eq("active", true)
          .order("discount_value", { ascending: false })

        if (!error && data) {
          const now = new Date()
          const valid = data.filter(
            (c: any) => !c.expires_at || new Date(c.expires_at) > now
          )
          if (mounted) setActiveCoupons(valid)
        }
      } catch (err) {
        console.error("Erro ao buscar cupons:", err)
      } finally {
        if (mounted) setIsLoadingCoupons(false)
      }
    }
    fetchCoupons()
    return () => {
      mounted = false
    }
  }, [])

  // Load user profile, admin status, addresses & order count
  useEffect(() => {
    if (!user) {
      setIsAdmin(false)
      setAddresses([])
      setIsLoadingAddresses(false)
      return
    }

    setProfileName(
      user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Cliente Batata Top"
    )
    setProfilePhone(user.user_metadata?.phone || "")
    setProfileCpf(user.user_metadata?.cpf || "")

    if (user.email && ADMIN_EMAILS.includes(user.email)) {
      setIsAdmin(true)
    }

    const supabase = getSupabaseBrowserClient()
    supabase
      .from("profiles")
      .select("role, full_name, phone, cpf")
      .eq("id", user.id)
      .single()
      .then(({ data }: any) => {
        if (data?.role === "admin") setIsAdmin(true)
        if (data?.full_name) setProfileName(data.full_name)
        if (data?.phone) setProfilePhone(data.phone)
        if (data?.cpf) setProfileCpf(data.cpf)
      })
      .catch(() => {})

    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("status", "cancelled")
      .then(({ count }: any) => {
        if (typeof count === "number") setOrdersCount(count)
      })
      .catch(() => {})

    loadAddresses()
  }, [user])

  const loadAddresses = async () => {
    if (!user) return
    setIsLoadingAddresses(true)
    setAddressError(null)
    try {
      const userAddresses = await addressesManager.getUserAddresses(user.id)
      setAddresses(userAddresses)
    } catch {
      setAddressError("Não foi possível carregar seus endereços.")
    } finally {
      setIsLoadingAddresses(false)
    }
  }

  const handleAddAddress = async () => {
    setAddressError(null)
    if (
      !newAddress.street ||
      !newAddress.number ||
      !newAddress.neighborhood ||
      !newAddress.cep
    ) {
      setAddressError("Preencha CEP, rua, número e bairro para salvar o endereço.")
      return
    }
    if (!user) return
    const address = {
      user_id: user.id,
      ...newAddress,
      is_default: addresses.length === 0,
    }
    const result = await addressesManager.addAddress(address)
    if (result) {
      await loadAddresses()
      setNewAddress({
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "Iacanga",
        state: "SP",
        cep: "",
      })
      setShowAddressForm(false)
      showToast("Endereço salvo com sucesso")
    } else {
      setAddressError("Erro ao adicionar endereço. Tente novamente.")
    }
  }

  const handleDeleteAddress = async (id: string) => {
    setAddressError(null)
    const success = await addressesManager.deleteAddress(id)
    if (success) {
      await loadAddresses()
      showToast("Endereço removido")
    } else {
      setAddressError("Erro ao remover endereço. Tente novamente.")
    }
  }

  const handleSetDefault = async (id: string) => {
    if (!user) return
    setAddressError(null)
    const success = await addressesManager.setDefaultAddress(user.id, id)
    if (success) {
      await loadAddresses()
      showToast("Endereço padrão atualizado")
    } else {
      setAddressError("Erro ao definir endereço padrão.")
    }
  }

  const handleCepChange = async (value: string) => {
    const formatted = value
      .replace(/\D/g, "")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .substring(0, 9)
    setNewAddress({ ...newAddress, cep: formatted })
    if (formatted.replace(/\D/g, "").length === 8) {
      try {
        const response = await fetch(
          `https://viacep.com.br/ws/${formatted.replace(/\D/g, "")}/json/`
        )
        const data = await response.json()
        if (!data.erro) {
          setNewAddress({
            ...newAddress,
            cep: formatted,
            street: data.logradouro || "",
            neighborhood: data.bairro || "",
            city: data.localidade || "Iacanga",
            state: data.uf || "SP",
          })
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error)
      }
    }
  }

  const handleSavePersonalData = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setProfileFeedback(null)
    setIsSavingProfile(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: profileName.trim(),
          phone: profilePhone.trim(),
          cpf: profileCpf.trim(),
        },
      })
      await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: profileName.trim(),
          phone: profilePhone.trim(),
          cpf: profileCpf.trim(),
          updated_at: new Date().toISOString(),
        })

      if (authError) {
        setProfileFeedback({
          type: "error",
          message: authError.message || "Não foi possível salvar suas alterações.",
        })
      } else {
        setProfileFeedback({
          type: "success",
          message: "Dados pessoais atualizados com sucesso!",
        })
        showToast("Dados atualizados com sucesso")
      }
    } catch {
      setProfileFeedback({
        type: "error",
        message: "Erro ao atualizar seus dados. Tente novamente.",
      })
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleClearSearchHistory = () => {
    try {
      if (typeof window !== "undefined") {
        const keysToRemove = [
          "batata_top_search_history",
          "search_history",
          "recent_searches",
          "bt_search_history",
        ]
        keysToRemove.forEach((k) => localStorage.removeItem(k))
      }
    } catch {}
    showToast("Histórico de busca limpo com sucesso")
  }

  const handleToggleNotification = (type: "orders" | "promos") => {
    if (type === "orders") {
      const next = !notifOrders
      setNotifOrders(next)
      try {
        localStorage.setItem("bt_notif_orders", String(next))
      } catch {}
      showToast(
        next
          ? "Avisos de status do pedido ativados"
          : "Avisos de status do pedido silenciados"
      )
    } else {
      const next = !notifPromos
      setNotifPromos(next)
      try {
        localStorage.setItem("bt_notif_promos", String(next))
      } catch {}
      showToast(
        next
          ? "Notificações de promoções ativadas"
          : "Notificações de promoções desativadas"
      )
    }
  }

  const handleCopyCoupon = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code)
    }
    setCopiedCode(code)
    showToast(`Cupom ${code} copiado!`)
    setTimeout(() => setCopiedCode(null), 2500)
  }

  const handleConfirmSignOut = async () => {
    setIsLoggingOut(true)
    try {
      await signOut()
      setLogoutModalOpen(false)
      router.push("/")
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleDeleteAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (confirmDeleteWord.trim().toUpperCase() !== "EXCLUIR") return
    setDeleteModalError(null)
    setIsDeletingAccount(true)
    try {
      const res = await fetch("/api/user/delete-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: user?.email || profilePhone || "usuario-autenticado",
          reason: deleteReason || "requested_via_profile_modal",
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || "Não foi possível processar a solicitação.")
      }
      setDeleteProtocol(
        data.protocol || `BT-${Math.floor(100000 + Math.random() * 900000)}`
      )
    } catch (err: any) {
      setDeleteModalError(
        err?.message || "Erro ao solicitar exclusão. Tente novamente."
      )
    } finally {
      setIsDeletingAccount(false)
    }
  }

  const toggleSubPanel = (accordionKey: string, panelKey: string) => {
    setOpenAccordion(accordionKey)
    setActiveSubPanel((prev) => (prev === panelKey ? null : panelKey))
  }

  if (loading) {
    return <ProfileSkeleton />
  }

  return (
    <div className="min-h-screen flex flex-col bg-white md:bg-[#F7F5F0] text-[#1A1A1A] antialiased">
      <HeaderWrapper />

      {/* Toast Global de Feedback Tátil */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-[#1A1A1A] text-white text-xs sm:text-sm font-semibold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="h-4 w-4 text-[#22C55E] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 pb-24 lg:pb-12">
        <div className="max-w-2xl mx-auto md:py-8 md:px-4">
          <div className="bg-white md:rounded-2xl md:shadow-sm md:border md:border-[#ECE7E0] overflow-hidden px-5 py-6">
            {/* Offline Banner */}
            {isOffline && (
              <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2.5">
                <WifiOff className="h-4 w-4 text-[#C1440E] shrink-0" />
                <span>
                  Você está offline. Alguns dados podem estar desatualizados até a reconexão.
                </span>
              </div>
            )}

            {/* =========================================================
                ESTADO DESLOGADO (!user) — Visitante estilo iFood
               ========================================================= */}
            {!user ? (
              <div>
                {/* Top Card Visitante */}
                <div className="p-5 rounded-2xl bg-[#F7F5F0] border border-[#ECE7E0] mb-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-14 w-14 rounded-full bg-[#F3F0EB] border border-[#ECE7E0] flex items-center justify-center text-[#717171] shrink-0">
                      <User className="h-7 w-7" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h1 className="text-xl font-bold text-[#1A1A1A] truncate">
                        Olá, visitante
                      </h1>
                      <p className="text-sm text-[#717171] font-medium mt-0.5">
                        Falta pouco para matar sua fome!
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push("/login")}
                    className="w-full py-3 px-5 rounded-xl bg-[#E3A008] hover:bg-[#CA8A04] active:bg-[#A16207] text-white font-semibold text-sm shadow-xs active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Entrar ou cadastrar
                  </button>
                </div>

                {/* Acordeões acessíveis no modo visitante */}
                <div className="divide-y divide-[#ECE7E0]">
                  <ProfileAccordionItem
                    icon={<Settings className="h-5 w-5" />}
                    title="Configurações"
                    subtitle="Notificações e limpar histórico de busca"
                    expanded={openAccordion === "guest-config"}
                    onToggle={() =>
                      setOpenAccordion(
                        openAccordion === "guest-config" ? null : "guest-config"
                      )
                    }
                    items={[
                      {
                        label: "Notificações do navegador",
                        isExpandedContent: activeSubPanel === "guest-notif",
                        onPress: () => toggleSubPanel("guest-config", "guest-notif"),
                        customContent: (
                          <div className="p-3.5 rounded-xl bg-[#F7F5F0] border border-[#ECE7E0] space-y-2.5 text-xs">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-[#1A1A1A]">
                                  Ofertas e Promoções do Dia
                                </p>
                                <p className="text-[#717171]">
                                  Receba avisos de cupons relâmpago neste navegador
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleNotification("promos")}
                                className={`h-6 w-11 rounded-full transition-colors p-0.5 cursor-pointer ${
                                  notifPromos ? "bg-[#22C55E]" : "bg-[#E5E7EB]"
                                }`}
                              >
                                <span
                                  className={`block h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                                    notifPromos ? "translate-x-5" : "translate-x-0"
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        ),
                      },
                      {
                        label: "Limpar histórico de busca",
                        onPress: handleClearSearchHistory,
                      },
                    ]}
                  />

                  <ProfileAccordionItem
                    icon={<HelpCircle className="h-5 w-5" />}
                    title="Ajuda e Termos"
                    subtitle="Dúvidas frequentes, termos de uso e políticas"
                    expanded={openAccordion === "guest-help"}
                    onToggle={() =>
                      setOpenAccordion(
                        openAccordion === "guest-help" ? null : "guest-help"
                      )
                    }
                    items={[
                      {
                        label: "Dúvidas Frequentes",
                        onPress: () => router.push("/ajuda"),
                      },
                      {
                        label: "Termos de Uso",
                        onPress: () => router.push("/termos"),
                      },
                      {
                        label: "Política de Privacidade",
                        onPress: () => router.push("/privacidade"),
                      },
                      {
                        label: "Política de Reembolso (CDC)",
                        onPress: () => router.push("/reembolso"),
                      },
                      {
                        label: "Fale Conosco via WhatsApp",
                        onPress: () =>
                          window.open("https://wa.me/5514997361015", "_blank"),
                      },
                    ]}
                  />
                </div>

                {/* Rodapé institucional do Perfil */}
                <div className="text-center pt-8 pb-2 space-y-1">
                  <p className="text-xs font-semibold text-[#717171]">
                    Batata Top Delivery • Iacanga - SP
                  </p>
                  <p className="text-[11px] text-[#717171]/80">
                    66.599.795 QUEILA LAIS MARQUES DA SILVA • CNPJ: 66.599.795/0001-04
                  </p>
                </div>
              </div>
            ) : (
              /* =========================================================
                  ESTADO LOGADO (user) — Perfil Completo estilo App Mobile
                 ========================================================= */
              <div>
                {/* 1. Cabeçalho de Perfil */}
                <div className="flex items-start sm:items-center gap-4 p-4 rounded-2xl bg-[#F3F0EB] md:bg-white border border-[#ECE7E0] mb-6">
                  <div className="h-16 w-16 rounded-full border-2 border-[#E3A008]/40 bg-[#FEF8EC] flex items-center justify-center text-[#A16207] font-bold text-lg overflow-hidden shrink-0 shadow-xs">
                    {user.user_metadata?.avatar_url ? (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt={profileName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>{getInitials(profileName || user.email)}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <h1 className="text-xl font-bold text-[#1A1A1A] truncate">
                        {profileName}
                      </h1>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF8EC] text-[#A16207] border border-[#E3A008]/40">
                        <Sparkles className="h-3 w-3 text-[#E3A008]" />
                        {ordersCount > 0
                          ? `Fidelidade Ativa • ${ordersCount} ${
                              ordersCount === 1 ? "pedido" : "pedidos"
                            }`
                          : "Cliente Batata Top"}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-[#717171]">
                      <span className="inline-flex items-center gap-1 truncate">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-[#717171]" />
                        {user.email}
                      </span>
                      <span className="hidden sm:inline text-[#ECE7E0]">•</span>
                      <span className="inline-flex items-center gap-1 truncate">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-[#717171]" />
                        {profilePhone || "Telefone não informado"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Card de Pagamento (Fiel ao App Mobile) */}
                <div className="mb-6">
                  <button
                    type="button"
                    onClick={() => router.push("/perfil/pagamentos")}
                    className="w-full text-left group cursor-pointer active:scale-[0.98] transition-transform"
                  >
                    <div className="relative z-10 bg-white rounded-2xl border border-[#F0F0F0] px-4 pt-0 pb-3.5 shadow-xs">
                      <img
                        src="/assets/batatatopestendida.png"
                        alt="Batata Top"
                        className="w-[100px] h-[50px] -mt-2.5 object-contain object-left"
                      />
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-[10px] bg-white flex items-center justify-center mr-3 shrink-0">
                          <CreditCard className="w-[18px] h-[18px] text-[#4A4A4A]" />
                        </div>
                        <span className="flex-1 text-[15px] font-bold text-[#1A1A1A]">
                          Pagamentos
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#CCCCCC] group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </div>
                    </div>
                    <div className="bg-[#EDEDED] rounded-b-2xl -mt-4 pt-6 pb-2.5 px-4 text-[13px] text-[#71717A]">
                      Gerencie suas formas de pagamento
                    </div>
                  </button>
                </div>

                {/* Atalho Painel Admin (Apenas Administradores) */}
                {isAdmin && (
                  <div className="mb-4">
                    <button
                      type="button"
                      onClick={() => router.push("/admin")}
                      className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#FEF8EC] border border-[#E3A008]/40 hover:bg-[#FEF8EC]/80 active:scale-[0.98] transition-all cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-[#E3A008]/20 flex items-center justify-center text-[#A16207]">
                          <ShieldAlert className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#1A1A1A]">
                            Painel Administrativo
                          </p>
                          <p className="text-xs text-[#717171]">
                            Gerenciar pedidos, cardápio e cupons da loja
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[#A16207]" />
                    </button>
                  </div>
                )}

                {/* 3. Lista de Acordeões Expansíveis (Idêntico ao App Mobile) */}
                <div className="divide-y divide-[#ECE7E0]">
                  {/* ACORDEÃO 1: Recompensas */}
                  <ProfileAccordionItem
                    icon={<Gift className="h-5 w-5" />}
                    title="Recompensas"
                    subtitle="Cupons de desconto e fidelidade"
                    expanded={openAccordion === "recompensas"}
                    onToggle={() =>
                      setOpenAccordion(
                        openAccordion === "recompensas" ? null : "recompensas"
                      )
                    }
                    items={[
                      {
                        label: "Cupons",
                        onPress: () => router.push("/cupons"),
                      },
                      {
                        label: "Histórico de Fidelidade e Pedidos",
                        onPress: () => router.push("/pedidos"),
                      },
                    ]}
                  />

                  {/* ACORDEÃO 2: Minha Conta */}
                  <ProfileAccordionItem
                    icon={<User className="h-5 w-5" />}
                    title="Minha Conta"
                    subtitle="Meus endereços e dados pessoais"
                    expanded={openAccordion === "conta"}
                    onToggle={() =>
                      setOpenAccordion(openAccordion === "conta" ? null : "conta")
                    }
                    items={[
                      {
                        label: "Meus Endereços cadastrados",
                        badge: `${addresses.length}`,
                        isExpandedContent: activeSubPanel === "enderecos",
                        onPress: () => toggleSubPanel("conta", "enderecos"),
                        customContent: (
                          <div className="p-3.5 rounded-xl bg-[#F7F5F0] border border-[#ECE7E0] space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#1A1A1A]">
                                Endereços de Entrega
                              </span>
                              {!showAddressForm && (
                                <button
                                  type="button"
                                  onClick={() => setShowAddressForm(true)}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#C1440E] hover:underline cursor-pointer"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  <span>Adicionar novo</span>
                                </button>
                              )}
                            </div>

                            {addressError && (
                              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-[#E63535] flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                <span>{addressError}</span>
                              </div>
                            )}

                            {isLoadingAddresses ? (
                              <div className="space-y-2">
                                <AddressCardSkeleton />
                              </div>
                            ) : addresses.length === 0 && !showAddressForm ? (
                              <p className="text-xs text-[#717171] text-center py-3">
                                Nenhum endereço cadastrado ainda.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {addresses.map((addr) => (
                                  <div
                                    key={addr.id}
                                    className={`p-3 rounded-xl border relative bg-white ${
                                      addr.is_default
                                        ? "border-[#E3A008] ring-1 ring-[#E3A008]/30"
                                        : "border-[#ECE7E0]"
                                    }`}
                                  >
                                    <div className="pr-16">
                                      <p className="font-semibold text-[#1A1A1A] text-xs sm:text-sm">
                                        {addr.street}, {addr.number}
                                      </p>
                                      <p className="text-xs text-[#717171]">
                                        {addr.neighborhood} • {addr.city}/{addr.state}
                                      </p>
                                      {addr.is_default && (
                                        <span className="inline-block mt-1 text-[10px] font-bold text-[#A16207] bg-[#FEF8EC] px-2 py-0.5 rounded-full uppercase">
                                          Padrão
                                        </span>
                                      )}
                                    </div>
                                    <div className="absolute right-2 top-2 flex gap-1">
                                      {!addr.is_default && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleSetDefault(addr.id)}
                                          className="cursor-pointer h-7 w-7 text-[#717171] hover:text-[#E3A008]"
                                          title="Definir como padrão"
                                        >
                                          <Check className="h-4 w-4" />
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteAddress(addr.id)}
                                        className="cursor-pointer h-7 w-7 text-[#717171] hover:text-[#E63535]"
                                        title="Excluir endereço"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {showAddressForm && (
                              <div className="p-3.5 bg-white border border-[#ECE7E0] rounded-xl space-y-3">
                                <div className="grid grid-cols-2 gap-2.5">
                                  <div className="col-span-2">
                                    <Label className="text-xs font-semibold text-[#717171]">
                                      CEP
                                    </Label>
                                    <Input
                                      placeholder="00000-000"
                                      value={newAddress.cep}
                                      onChange={(e) => handleCepChange(e.target.value)}
                                      maxLength={9}
                                      className="h-9 rounded-lg border-[#E5E7EB] text-xs"
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <Label className="text-xs font-semibold text-[#717171]">
                                      Rua / Logradouro
                                    </Label>
                                    <Input
                                      placeholder="Nome da rua"
                                      value={newAddress.street}
                                      onChange={(e) =>
                                        setNewAddress({
                                          ...newAddress,
                                          street: e.target.value,
                                        })
                                      }
                                      className="h-9 rounded-lg border-[#E5E7EB] text-xs"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs font-semibold text-[#717171]">
                                      Número
                                    </Label>
                                    <Input
                                      placeholder="123"
                                      value={newAddress.number}
                                      onChange={(e) =>
                                        setNewAddress({
                                          ...newAddress,
                                          number: e.target.value,
                                        })
                                      }
                                      className="h-9 rounded-lg border-[#E5E7EB] text-xs"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs font-semibold text-[#717171]">
                                      Bairro
                                    </Label>
                                    <Input
                                      placeholder="Bairro"
                                      value={newAddress.neighborhood}
                                      onChange={(e) =>
                                        setNewAddress({
                                          ...newAddress,
                                          neighborhood: e.target.value,
                                        })
                                      }
                                      className="h-9 rounded-lg border-[#E5E7EB] text-xs"
                                    />
                                  </div>
                                </div>
                                <div className="flex gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={handleAddAddress}
                                    className="flex-1 py-2 px-3 rounded-lg bg-[#E3A008] hover:bg-[#CA8A04] text-white text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer"
                                  >
                                    Salvar Endereço
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setShowAddressForm(false)}
                                    className="py-2 px-3 rounded-lg border border-[#ECE7E0] text-xs font-medium text-[#717171] hover:text-[#1A1A1A] cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ),
                      },
                      {
                        label: "Dados Pessoais (Nome, CPF, Telefone)",
                        isExpandedContent: activeSubPanel === "dados",
                        onPress: () => toggleSubPanel("conta", "dados"),
                        customContent: (
                          <form
                            onSubmit={handleSavePersonalData}
                            className="p-4 rounded-xl bg-[#F7F5F0] border border-[#ECE7E0] space-y-3"
                          >
                            <div className="space-y-2.5">
                              <div>
                                <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                                  Nome completo
                                </label>
                                <input
                                  type="text"
                                  value={profileName}
                                  onChange={(e) => setProfileName(e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-xs sm:text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#E3A008]"
                                />
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div>
                                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                                    Telefone / WhatsApp
                                  </label>
                                  <input
                                    type="text"
                                    value={profilePhone}
                                    onChange={(e) => setProfilePhone(e.target.value)}
                                    placeholder="(14) 99999-9999"
                                    className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-xs sm:text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#E3A008]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                                    CPF (opcional)
                                  </label>
                                  <input
                                    type="text"
                                    value={profileCpf}
                                    onChange={(e) => setProfileCpf(e.target.value)}
                                    placeholder="000.000.000-00"
                                    className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-xs sm:text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#E3A008]"
                                  />
                                </div>
                              </div>
                            </div>

                            {profileFeedback && (
                              <p
                                className={`text-xs font-medium ${
                                  profileFeedback.type === "success"
                                    ? "text-[#22C55E]"
                                    : "text-[#E63535]"
                                }`}
                              >
                                {profileFeedback.message}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                              <button
                                type="submit"
                                disabled={isSavingProfile}
                                className="px-4 py-2 rounded-lg bg-[#E3A008] hover:bg-[#CA8A04] text-white text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                              >
                                {isSavingProfile
                                  ? "Salvando..."
                                  : "Salvar Dados Pessoais"}
                              </button>
                              <Link
                                href="/meus-dados"
                                className="text-xs font-semibold text-[#717171] hover:text-[#1A1A1A] underline"
                              >
                                Abrir página completa de dados
                              </Link>
                            </div>
                          </form>
                        ),
                      },
                    ]}
                  />

                  {/* ACORDEÃO 3: Configurações & Segurança */}
                  <ProfileAccordionItem
                    icon={<Settings className="h-5 w-5" />}
                    title="Configurações & Segurança"
                    subtitle="Notificações e segurança da conta"
                    expanded={openAccordion === "seguranca"}
                    onToggle={() =>
                      setOpenAccordion(
                        openAccordion === "seguranca" ? null : "seguranca"
                      )
                    }
                    items={[
                      {
                        label: "Notificações",
                        isExpandedContent: activeSubPanel === "notificacoes",
                        onPress: () => toggleSubPanel("seguranca", "notificacoes"),
                        customContent: (
                          <div className="p-3.5 rounded-xl bg-[#F7F5F0] border border-[#ECE7E0] space-y-3 text-xs">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-[#1A1A1A]">
                                  Atualizações de Pedidos
                                </p>
                                <p className="text-[#717171]">
                                  Avisos sobre preparo e saída para entrega
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleNotification("orders")}
                                className={`h-6 w-11 rounded-full transition-colors p-0.5 cursor-pointer ${
                                  notifOrders ? "bg-[#22C55E]" : "bg-[#E5E7EB]"
                                }`}
                              >
                                <span
                                  className={`block h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                                    notifOrders ? "translate-x-5" : "translate-x-0"
                                  }`}
                                />
                              </button>
                            </div>

                            <div className="border-t border-[#ECE7E0] pt-2.5 flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-[#1A1A1A]">
                                  Cupons e Promoções
                                </p>
                                <p className="text-[#717171]">
                                  Descontos exclusivos e novidades do cardápio
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleNotification("promos")}
                                className={`h-6 w-11 rounded-full transition-colors p-0.5 cursor-pointer ${
                                  notifPromos ? "bg-[#22C55E]" : "bg-[#E5E7EB]"
                                }`}
                              >
                                <span
                                  className={`block h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                                    notifPromos ? "translate-x-5" : "translate-x-0"
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        ),
                      },
                      {
                        label: "Segurança da Conta (Senha, Sessão e LGPD)",
                        onPress: () => router.push("/perfil/seguranca"),
                      },
                      {
                        label: "Limpar histórico de busca",
                        onPress: handleClearSearchHistory,
                      },
                      {
                        label: "Excluir minha conta (LGPD)",
                        danger: true,
                        onPress: () => {
                          setConfirmDeleteWord("")
                          setDeleteProtocol(null)
                          setDeleteModalError(null)
                          setDeleteModalOpen(true)
                        },
                      },
                    ]}
                  />

                  {/* ACORDEÃO 4: Ajuda e Termos */}
                  <ProfileAccordionItem
                    icon={<HelpCircle className="h-5 w-5" />}
                    title="Ajuda e Termos"
                    subtitle="Dúvidas frequentes, termos e suporte"
                    expanded={openAccordion === "ajuda"}
                    onToggle={() =>
                      setOpenAccordion(openAccordion === "ajuda" ? null : "ajuda")
                    }
                    items={[
                      {
                        label: "Dúvidas Frequentes",
                        onPress: () => router.push("/ajuda"),
                      },
                      {
                        label: "Termos de Uso",
                        onPress: () => router.push("/termos"),
                      },
                      {
                        label: "Política de Privacidade",
                        onPress: () => router.push("/privacidade"),
                      },
                      {
                        label: "Política de Reembolso (CDC)",
                        onPress: () => router.push("/reembolso"),
                      },
                      {
                        label: "Fale Conosco via WhatsApp",
                        onPress: () =>
                          window.open("https://wa.me/5514997361015", "_blank"),
                      },
                    ]}
                  />
                </div>

                {/* 4. Botão Sair da Conta com Modal de Confirmação */}
                <div className="mt-6 pt-4 border-t border-[#ECE7E0]">
                  <button
                    type="button"
                    onClick={() => setLogoutModalOpen(true)}
                    className="w-full py-3.5 px-4 rounded-xl border border-[#ECE7E0] hover:bg-red-50 text-[#C1440E] hover:text-[#E63535] font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sair da conta</span>
                  </button>
                </div>

                {/* Rodapé Institucional */}
                <div className="text-center pt-6 pb-1 space-y-1">
                  <p className="text-xs font-semibold text-[#717171]">
                    Batata Top Delivery • Versão 2.2
                  </p>
                  <p className="text-[11px] text-[#717171]/80">
                    66.599.795 QUEILA LAIS MARQUES DA SILVA • CNPJ: 66.599.795/0001-04
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* =========================================================
          MODAL DE CONFIRMAÇÃO DE LOGOUT
         ========================================================= */}
      {logoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-[#ECE7E0] max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-full bg-red-50 text-[#E63535] flex items-center justify-center">
                <LogOut className="h-5 w-5" />
              </div>
              <button
                type="button"
                onClick={() => setLogoutModalOpen(false)}
                className="h-8 w-8 rounded-full hover:bg-[#F7F5F0] flex items-center justify-center text-[#717171] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <h2 className="text-lg font-bold text-[#1A1A1A]">
                Deseja sair da sua conta?
              </h2>
              <p className="text-xs sm:text-sm text-[#717171] mt-1">
                Você precisará fazer login novamente para acessar seus endereços salvos e acompanhar pedidos.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setLogoutModalOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-[#ECE7E0] text-xs sm:text-sm font-semibold text-[#1A1A1A] hover:bg-[#F7F5F0] active:scale-[0.98] transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={handleConfirmSignOut}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#E63535] hover:bg-[#C1440E] text-white text-xs sm:text-sm font-semibold active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoggingOut ? "Saindo..." : "Sair agora"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL DE EXCLUSÃO DE CONTA (CONFORMIDADE LGPD)
         ========================================================= */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-[#ECE7E0] max-w-md w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-red-50 text-[#E63535] flex items-center justify-center">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1A1A1A]">
                    Exclusão de Conta (LGPD)
                  </h2>
                  <p className="text-[11px] text-[#717171]">
                    Ação permanente e irreversível
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="h-8 w-8 rounded-full hover:bg-[#F7F5F0] flex items-center justify-center text-[#717171] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F7F5F0] border border-[#ECE7E0] text-xs space-y-2 text-[#717171]">
              <p>
                <strong className="text-[#1A1A1A]">Dados excluídos:</strong> Perfil, nome, CPF, e-mail, telefone e endereços cadastrados.
              </p>
              <p>
                <strong className="text-[#1A1A1A]">Histórico fiscal:</strong> Pedidos faturados são anonimizados e retidos por 5 anos conforme obrigação legal.
              </p>
              <p className="text-[#E63535] font-semibold">
                Atenção: Esta ação é irreversível e não poderá ser desfeita.
              </p>
            </div>

            {!deleteProtocol ? (
              <form onSubmit={handleDeleteAccountSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                    Motivo da exclusão (opcional)
                  </label>
                  <input
                    type="text"
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="Conte-nos brevemente o motivo..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-xs sm:text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#E3A008]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                    Digite <span className="font-mono font-bold text-[#E63535]">EXCLUIR</span> para confirmar:
                  </label>
                  <input
                    type="text"
                    value={confirmDeleteWord}
                    onChange={(e) => setConfirmDeleteWord(e.target.value)}
                    placeholder='Digite "EXCLUIR"'
                    className="w-full px-3.5 py-2.5 rounded-xl border border-red-200 text-xs sm:text-sm font-bold uppercase text-[#1A1A1A] placeholder:normal-case placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#E63535]"
                  />
                </div>

                {deleteModalError && (
                  <p className="text-xs text-[#E63535] font-medium">
                    {deleteModalError}
                  </p>
                )}

                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setDeleteModalOpen(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-[#ECE7E0] text-xs font-semibold text-[#1A1A1A] hover:bg-[#F7F5F0] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={
                      confirmDeleteWord.trim().toUpperCase() !== "EXCLUIR" ||
                      isDeletingAccount
                    }
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#E63535] hover:bg-[#C1440E] text-white text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                  >
                    {isDeletingAccount
                      ? "Processando..."
                      : "Confirmar Exclusão"}
                  </button>
                </div>

                <div className="text-center pt-1">
                  <Link
                    href="/perfil/seguranca#excluir-conta"
                    onClick={() => setDeleteModalOpen(false)}
                    className="text-[11px] font-semibold text-[#717171] hover:text-[#1A1A1A] underline"
                  >
                    Abrir Central de Segurança e Portabilidade completa
                  </Link>
                </div>
              </form>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-green-50 border border-green-200 text-green-900 space-y-1.5">
                  <p className="font-bold text-green-800 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#22C55E]" />
                    Solicitação registrada!
                  </p>
                  <p>
                    Protocolo: <strong className="font-mono">{deleteProtocol}</strong>
                  </p>
                  <p>
                    Seus dados serão anonimizados em até 7 dias corridos conforme a LGPD.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleConfirmSignOut}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#1A1A1A] text-white font-semibold text-xs cursor-pointer"
                >
                  Encerrar sessão e voltar ao início
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />
      <OrderSummary />
    </div>
  )
}
