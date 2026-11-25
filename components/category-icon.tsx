"use client"

import { useState, useEffect, type CSSProperties } from "react"
import {
  UtensilsCrossed,
  Flame,
  Utensils,
  CupSoda,
  BookOpen,
  Ticket,
  LayoutGrid,
  Pizza,
  Sandwich,
  IceCreamCone,
  Coffee,
  Soup,
  Beef,
  Salad,
  Cookie,
  Sparkles,
  Tag,
  ShoppingBag,
  Star,
  ChefHat,
  Percent,
  Gift,
  type LucideIcon,
} from "lucide-react"
import type { CategoryIconType } from "@/lib/categories-db"

const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  UtensilsCrossed,
  Flame,
  Utensils,
  CupSoda,
  BookOpen,
  Ticket,
  LayoutGrid,
  Pizza,
  Sandwich,
  IceCreamCone,
  Coffee,
  Soup,
  Beef,
  Salad,
  Cookie,
  Sparkles,
  Tag,
  ShoppingBag,
  Star,
  ChefHat,
  Percent,
  Gift,
}

export function getLucideIconComponent(name?: string | null): LucideIcon {
  if (!name) return UtensilsCrossed
  return LUCIDE_ICON_MAP[name] || UtensilsCrossed
}

export interface CategoryIconProps {
  iconUrl?: string | null
  iconType?: CategoryIconType
  fallbackIcon?: string | null
  accentColor?: string | null
  alt?: string
  sizeClassName?: string
  iconClassName?: string
  className?: string
}

export function CategoryIcon({
  iconUrl,
  iconType = "preset_3d",
  fallbackIcon = "UtensilsCrossed",
  accentColor = "#E3A008",
  alt = "",
  sizeClassName = "w-10 h-10",
  iconClassName = "w-5 h-5",
  className = "",
}: CategoryIconProps) {
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    setImgError(false)
  }, [iconUrl, iconType])

  const shouldShowImage = iconType !== "lucide" && Boolean(iconUrl) && !imgError

  if (shouldShowImage && iconUrl) {
    return (
      <img
        src={iconUrl}
        alt={alt}
        aria-hidden={alt === "" ? true : undefined}
        onError={() => setImgError(true)}
        className={`${sizeClassName} object-contain select-none ${className}`}
      />
    )
  }

  const IconComp = getLucideIconComponent(fallbackIcon)
  const color = accentColor || "#E3A008"
  const bgStyle: CSSProperties = {
    backgroundColor: `${color}1A`,
    color,
    borderColor: `${color}33`,
  }

  return (
    <span
      aria-hidden={alt === "" ? true : undefined}
      style={bgStyle}
      className={`${sizeClassName} inline-flex items-center justify-center rounded-xl border shrink-0 ${className}`}
    >
      <IconComp className={iconClassName} />
    </span>
  )
}
