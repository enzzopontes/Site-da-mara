"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useCart } from "@/lib/cart-context"

export function CartBar() {
  const pathname = usePathname()
  const { items, getTotalPrice } = useCart()

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = getTotalPrice()

  // Regras estritas de ocultação da Barra Flutuante da Sacola
  const isHiddenRoute =
    !pathname ||
    pathname === "/checkout" ||
    pathname.startsWith("/checkout") ||
    pathname === "/carrinho" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/cadastro") ||
    pathname.startsWith("/enderecos") ||
    pathname.startsWith("/cupons") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/payments") ||
    pathname.startsWith("/reset-password")

  // Exibir somente quando totalItems > 0 e não estiver em rota restrita
  if (totalItems <= 0 || isHiddenRoute) {
    return null
  }

  // Verifica se a TabBar móvel está visível para calcular o offset inferior
  const isMainTab =
    pathname === "/" ||
    pathname === "/cardapio" ||
    pathname === "/pedidos" ||
    pathname === "/perfil" ||
    pathname === "/profile"

  // Se a TabBar estiver ativa no mobile, fica acima dela (bottom-16 = 64px)
  const bottomPositionClass = isMainTab
    ? "bottom-16 lg:bottom-4"
    : "bottom-0 lg:bottom-4"

  return (
    <aside
      aria-label="Resumo da sacola flutuante"
      className={`fixed ${bottomPositionClass} left-0 right-0 z-40 transition-all duration-300 ease-out animate-in slide-in-from-bottom-4`}
    >
      <div className="max-w-xl mx-auto px-3 sm:px-4">
        <div className="bg-white border border-[#ECE7E0] shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-2xl sm:rounded-3xl p-3 flex items-center justify-between gap-3">
          {/* Logo + Preço */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0 rounded-full overflow-hidden bg-[#F7F5F0] border border-[#ECE7E0] flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Batata Top Logo"
                width={48}
                height={48}
                className="w-10 h-10 object-contain"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] sm:text-xs text-[#6B6157] font-medium truncate">
                Total com <strong className="font-bold text-[#1F1B16]">entrega grátis</strong>
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base sm:text-lg font-black text-[#1F1B16] tracking-tight">
                  R$ {totalPrice.toFixed(2).replace(".", ",")}
                </span>
                <span className="text-xs text-[#9C9188] font-bold">
                  / {totalItems} {totalItems === 1 ? "item" : "itens"}
                </span>
              </div>
            </div>
          </div>

          {/* Botão Pill Amarelo "Ver sacola" direcionando direto para /checkout */}
          <Link
            href="/checkout"
            className="flex-shrink-0 h-11 sm:h-12 px-5 sm:px-6 bg-[#E3A008] hover:bg-[#C1440E] active:scale-[0.98] text-white font-black text-sm sm:text-base rounded-full shadow-md flex items-center justify-center transition-all duration-200"
          >
            Ver sacola
          </Link>
        </div>
      </div>
    </aside>
  )
}
