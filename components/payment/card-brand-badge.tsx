"use client"

import React, { useState } from 'react'
import { CreditCard } from 'lucide-react'

export type CardBrand = 'visa' | 'master' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | string

export interface CardBrandBadgeProps {
  brand?: CardBrand | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const BRAND_LOGOS: Record<string, string> = {
  visa: 'https://raw.githubusercontent.com/aaronfagan/svg-credit-card-payment-icons/main/flat/visa.svg',
  master: 'https://raw.githubusercontent.com/aaronfagan/svg-credit-card-payment-icons/main/flat/mastercard.svg',
  mastercard: 'https://raw.githubusercontent.com/aaronfagan/svg-credit-card-payment-icons/main/flat/mastercard.svg',
  elo: 'https://raw.githubusercontent.com/aaronfagan/svg-credit-card-payment-icons/main/flat/elo.svg',
  amex: 'https://raw.githubusercontent.com/aaronfagan/svg-credit-card-payment-icons/main/flat/amex.svg',
  hipercard: 'https://raw.githubusercontent.com/aaronfagan/svg-credit-card-payment-icons/main/flat/hipercard.svg',
}

export function normalizeBrandId(raw?: string | null): string {
  const b = (raw || '').toLowerCase().trim()
  if (b.includes('visa')) return 'visa'
  if (b.includes('master')) return 'master'
  if (b.includes('elo')) return 'elo'
  if (b.includes('amex')) return 'amex'
  if (b.includes('hiper')) return 'hipercard'
  return 'default'
}

export function CardBrandBadge({ brand, size = 'md', className = '' }: CardBrandBadgeProps) {
  const [loadError, setLoadError] = useState(false)
  const key = normalizeBrandId(brand)
  const logoUrl = BRAND_LOGOS[key]

  const sizeClasses = {
    sm: 'w-[34px] h-[22px]',
    md: 'w-[40px] h-[26px]',
    lg: 'w-[48px] h-[31px]',
  }[size]

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20,
  }[size]

  const renderFallback = () => {
    if (key === 'visa') {
      return (
        <span className="font-extrabold italic tracking-tighter text-[#1A1F71] text-[10px] sm:text-[11px] select-none leading-none">
          VISA
        </span>
      )
    }
    if (key === 'master' || key === 'mastercard') {
      return (
        <div className="flex items-center -space-x-1.5 select-none">
          <div className="w-2.5 h-2.5 rounded-full bg-[#EB001B]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#F79E1B]" />
        </div>
      )
    }
    if (key === 'elo') {
      return (
        <span className="font-black tracking-tight text-neutral-900 text-[9px] select-none leading-none">
          elo
        </span>
      )
    }
    if (key === 'amex') {
      return (
        <span className="font-extrabold tracking-tight text-[#006FCF] text-[8px] select-none leading-none">
          AMEX
        </span>
      )
    }
    if (key === 'hipercard') {
      return (
        <span className="font-black italic tracking-tight text-[#B91C1C] text-[8px] select-none leading-none">
          hiper
        </span>
      )
    }

    return <CreditCard size={iconSizes} className="text-neutral-500" />
  }

  return (
    <div
      className={`rounded-[4px] border border-[#E4E4E7] bg-white flex items-center justify-center overflow-hidden shrink-0 select-none ${sizeClasses} ${className}`}
    >
      {logoUrl && !loadError ? (
        <img
          src={logoUrl}
          alt={key}
          className="w-full h-full object-cover p-0"
          onError={() => setLoadError(true)}
          loading="lazy"
        />
      ) : (
        renderFallback()
      )}
    </div>
  )
}

export default CardBrandBadge
