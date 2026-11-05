"use client"

import React from "react"
import { Zap, ChevronRight } from "lucide-react"

interface FreeCouponCardProps {
  count: number
  onPress?: () => void
}

const FREE_COUPON_PURPLE = "#7B2FBE"

export function FreeCouponCard({ count, onPress }: FreeCouponCardProps) {
  if (!count) return null

  return (
    <div
      onClick={onPress}
      className="flex items-center justify-between border-2 border-[#1F1B16] rounded-2xl p-4 mb-4 bg-white cursor-pointer active:scale-[0.99] transition-transform select-none"
    >
      <div className="flex-1">
        <h3 className="text-base font-bold text-[#1F1B16]">Você ganhou cupons grátis</h3>
        <div className="flex items-center gap-1.5 mt-2">
          <Zap className="w-3.5 h-3.5 fill-[#7B2FBE] text-[#7B2FBE]" />
          <span className="text-xs font-bold text-[#7B2FBE]">
            {count} disponíve{count === 1 ? "l" : "is"}
          </span>
        </div>
      </div>

      <div className="w-9 h-9 rounded-full bg-[#C1440E] flex items-center justify-center flex-shrink-0 text-white shadow-xs">
        <ChevronRight className="w-5 h-5 text-white" />
      </div>
    </div>
  )
}
