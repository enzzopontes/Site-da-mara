"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import {
  Home,
  Package,
  User,
  UtensilsCrossed,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCart } from "@/lib/cart-context"

export function MobileNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const { items, getTotalPrice } = useCart()

  const totalCartItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalCartPrice = getTotalPrice()

  // Não exibir no checkout para garantir fluxo focado e rodapé desobstruído
  if (pathname === "/checkout" || pathname?.startsWith("/checkout")) return null

  const showFloatingCart = totalCartItems > 0 && pathname !== "/carrinho" && !pathname?.startsWith("/checkout")

  const isActive = (path: string) => {
    if (!pathname) return false
    if (path === "/" && pathname === "/") return true
    if (path === "/cardapio" && pathname.startsWith("/cardapio")) return true
    if (path === "/pedidos" && pathname.startsWith("/pedidos")) return true
    if (path === "/perfil" && (pathname === "/perfil" || pathname.startsWith("/perfil/"))) return true
    if (path !== "/" && path !== "#" && pathname.startsWith(path)) return true
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
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden pointer-events-none">
      {/* Floating Cart Bar */}
      {showFloatingCart && (
        <div className="pointer-events-auto border-t border-[#ECE7E0] bg-white py-2.5 px-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <Image
                src="/logo.png"
                alt="Batata Top"
                width={40}
                height={40}
                className="w-10 h-10 object-contain rounded-full flex-shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-[#6B6157] truncate">
                  Total com <strong className="font-bold text-[#1F1B16]">entrega grátis</strong>
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-bold text-[#1F1B16]">
                    R$ {totalCartPrice.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-xs text-[#9C9188]">
                    / {totalCartItems} {totalCartItems === 1 ? 'item' : 'itens'}
                  </span>
                </div>
              </div>
            </div>

            <Link
              href="/carrinho"
              className="w-1/2 max-w-[180px] h-10 bg-[#E3A008] hover:bg-[#B5860A] text-white font-bold text-sm rounded-lg flex items-center justify-center shadow-xs active:scale-[0.98] transition-all"
            >
              Ver sacola
            </Link>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="pointer-events-auto bg-white border-t border-[#ECE7E0] pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
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
