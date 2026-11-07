"use client"

import React, { useState } from "react"
import Image from "next/image"
import { Tag, X, XCircle, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useCart } from "@/lib/cart-context"
import { useCoupons } from "@/hooks/use-coupons"
import { CouponCard } from "@/components/coupons/coupon-card"
import { CuponsSkeleton } from "@/components/coupons/cupons-skeleton"
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
} from "@/components/ui/responsive-modal"

interface CouponModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCouponApplied?: () => void
}

export function CouponModal({ open, onOpenChange, onCouponApplied }: CouponModalProps) {
  const { getTotalPrice, coupon: selectedCoupon, setCoupon } = useCart()
  const currentTotal = getTotalPrice()
  const { coupons, loading, validateCoupon, getCouponMissingAmount } = useCoupons(
    currentTotal,
    selectedCoupon?.id
  )

  const [code, setCode] = useState("")
  const [applying, setApplying] = useState(false)

  const handleApply = async () => {
    if (!code.trim() || applying) return
    setApplying(true)
    const result = await validateCoupon(code)
    setApplying(false)

    if (!result.valid) {
      toast.error(result.reason || "Cupom inválido")
      return
    }

    setCoupon(result.coupon)
    toast.success("Cupom aplicado com sucesso!")
    onCouponApplied?.()
    onOpenChange(false)
  }

  const handleSelect = (coupon: any) => {
    const isSame = selectedCoupon?.id === coupon.id
    const nextCoupon = isSame ? null : coupon
    setCoupon(nextCoupon)
    if (nextCoupon) {
      toast.success(`Cupom ${coupon.code} selecionado!`)
      onCouponApplied?.()
      onOpenChange(false)
    } else {
      toast.info("Cupom removido")
    }
  }

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent
        showCloseButton={false}
        showHandle={true}
        className="p-0 border-none sm:border sm:border-gray-100 bg-white flex flex-col overflow-hidden sm:max-w-lg sm:rounded-3xl rounded-t-[28px] max-h-[90vh]"
      >
        {/* HEADER */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FEF8EC] text-[#E3A008] flex items-center justify-center shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <ResponsiveModalTitle className="text-lg font-black text-[#1F1B16]">
                Cupons de Desconto
              </ResponsiveModalTitle>
              <ResponsiveModalDescription className="text-xs text-gray-500 font-medium">
                Insira o código ou escolha um cupom disponível
              </ResponsiveModalDescription>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors"
            aria-label="Fechar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* INPUT DE CÓDIGO */}
        <div className="p-4 sm:p-5 border-b border-gray-100 bg-[#FAFAFA] shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 border border-gray-200 rounded-2xl px-3 py-1 bg-white focus-within:border-[#E3A008] focus-within:ring-2 focus-within:ring-[#E3A008]/20 transition-all">
              <div className="w-8 h-8 flex items-center justify-center shrink-0">
                <Image
                  src="/assets/ticketsolo.png"
                  alt="Ticket"
                  width={28}
                  height={28}
                  className="object-contain"
                />
              </div>

              <input
                type="text"
                placeholder="DIGITE SEU CUPOM"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleApply()
                }}
                data-vaul-no-drag
                className="flex-1 text-sm text-[#1F1B16] placeholder-gray-400 bg-transparent outline-none uppercase font-bold"
              />

              {code.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCode("")}
                  className="p-1 text-gray-400 hover:text-gray-700"
                  aria-label="Limpar código"
                  data-vaul-no-drag
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleApply}
              disabled={!code.trim() || applying}
              data-vaul-no-drag
              className={`h-11 px-4 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center ${
                code.trim() && !applying
                  ? "bg-[#E3A008] hover:bg-[#C68A07] active:scale-95 text-white shadow-sm cursor-pointer"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
            </button>
          </div>
        </div>

        {/* LISTA DE CUPONS */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {loading ? (
            <CuponsSkeleton />
          ) : coupons.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-sm font-bold text-gray-700">Nenhum cupom ativo no momento</p>
              <p className="text-xs text-gray-400">Fique atento aos nossos banners e redes sociais!</p>
            </div>
          ) : (
            coupons.map((coupon, index) => {
              const missing = getCouponMissingAmount(coupon)
              const isSelected = selectedCoupon?.id === coupon.id
              const isApplicable = missing === 0 && !coupon.isExhausted

              const prevCoupon = index > 0 ? coupons[index - 1] : null
              const prevApplicable = prevCoupon
                ? getCouponMissingAmount(prevCoupon) === 0 && !prevCoupon.isExhausted
                : false
              const showUnavailableDivider = !isApplicable && prevApplicable

              return (
                <React.Fragment key={coupon.id}>
                  {showUnavailableDivider && (
                    <div className="pt-2 pb-0.5">
                      <p className="text-[11px] font-black uppercase tracking-wider text-[#8C827A]">
                        Indisponíveis para este pedido
                      </p>
                    </div>
                  )}
                  <div
                    onClick={() => isApplicable && handleSelect(coupon)}
                    data-vaul-no-drag
                    className={`rounded-2xl border transition-all ${
                      isSelected
                        ? "border-[#E3A008] bg-[#FEF8EC] shadow-sm ring-1 ring-[#E3A008]"
                        : isApplicable
                        ? "border-gray-200 bg-white hover:border-gray-300 cursor-pointer"
                        : "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <CouponCard
                      coupon={coupon}
                      currentTotal={currentTotal}
                      isSelected={isSelected}
                      missingAmount={missing}
                      onSelect={() => isApplicable && handleSelect(coupon)}
                    />
                  </div>
                </React.Fragment>
              )
            })
          )}
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
