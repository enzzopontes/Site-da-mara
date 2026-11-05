"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Home,
  Package,
  User,
  UtensilsCrossed,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export function MobileNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()

  // REGRAS ESTRITAS DE VISIBILIDADE:
  // EXIBIR APENAS: Nas abas principais ("/", "/cardapio", "/pedidos", "/profile" ou "/perfil").
  // OCULTAR ESTRITAMENTE: /checkout, /carrinho, /produto/[id], /auth/*, /login, /cadastro, /enderecos, /cupons, /payments, /pedidos/[id], /admin.
  const isMainTab =
    pathname === "/" ||
    pathname === "/cardapio" ||
    pathname === "/pedidos" ||
    pathname === "/perfil" ||
    pathname === "/profile"

  if (!isMainTab) return null

  const isActive = (path: string) => {
    if (!pathname) return false
    if (path === "/" && pathname === "/") return true
    if (path === "/cardapio" && pathname === "/cardapio") return true
    if (path === "/pedidos" && pathname === "/pedidos") return true
    if (path === "/perfil" && (pathname === "/perfil" || pathname === "/profile")) return true
    return false
  }

  const handleCardapioClick = () => {
    if (pathname === "/cardapio") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      router.push("/cardapio")
    }
  }

  const navItems = [
    { href: "/", icon: Home, label: "Início", action: null },
    { href: "/cardapio", icon: UtensilsCrossed, label: "Cardápio", action: handleCardapioClick },
    { href: "/pedidos", icon: Package, label: "Pedidos", action: null },
    { href: user ? "/perfil" : "/login", icon: User, label: user ? "Perfil" : "Entrar", action: null },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      {/* Bottom Navigation */}
      <nav aria-label="Navegação móvel principal" className="bg-white border-t border-[#ECE7E0] pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-around h-16 relative max-w-lg mx-auto px-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)

            if (item.action) {
              return (
                <button
                  key={item.label}
                  onClick={item.action}
                  aria-label={item.label}
                  className="flex flex-col items-center justify-center flex-1 h-full min-h-[44px] min-w-[44px] group active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A008] rounded-lg cursor-pointer"
                >
                  <div className="relative flex items-center justify-center mb-0.5">
                    <Icon className={`h-6 w-6 sm:h-7 sm:w-7 transition-colors ${active ? "text-[#E3A008] fill-current" : "text-[#717171]"}`} aria-hidden="true" />
                  </div>
                  <span className={`text-[10px] sm:text-[11px] font-bold transition-colors text-center w-full truncate px-1 ${
                    active ? "text-[#E3A008]" : "text-[#717171]"
                  }`}>
                    {item.label}
                  </span>
                </button>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center flex-1 h-full min-h-[44px] min-w-[44px] group active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A008] rounded-lg cursor-pointer"
                aria-label={item.label}
              >
                <div className="relative flex items-center justify-center mb-0.5">
                  <Icon className={`h-6 w-6 sm:h-7 sm:w-7 transition-colors ${active ? "text-[#E3A008] fill-current" : "text-[#717171]"}`} aria-hidden="true" />
                </div>
                <span className={`text-[10px] sm:text-[11px] font-bold transition-colors text-center w-full truncate px-1 ${
                  active ? "text-[#E3A008]" : "text-[#717171]"
                }`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
