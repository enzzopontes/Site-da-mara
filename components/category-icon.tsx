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
  CookingPot,
  HandPlatter,
  Microwave,
  Cake,
  CakeSlice,
  Dessert,
  Donut,
  Candy,
  IceCreamBowl,
  Popsicle,
  Croissant,
  Drumstick,
  Ham,
  Fish,
  EggFried,
  Popcorn,
  Beer,
  Wine,
  Martini,
  GlassWater,
  Citrus,
  Milk,
  Wheat,
  Cherry,
  Carrot,
  Package,
  ShoppingBasket,
  Crown,
  type LucideIcon,
} from "lucide-react"
import type { CategoryIconType } from "@/lib/categories-db"
import { isSafeIconUrl, normalizeCategoryIconScale } from "@/lib/category-icons"

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
  CookingPot,
  HandPlatter,
  Microwave,
  Cake,
  CakeSlice,
  Dessert,
  Donut,
  Candy,
  IceCreamBowl,
  Popsicle,
  Croissant,
  Drumstick,
  Ham,
  Fish,
  EggFried,
  Popcorn,
  Beer,
  Wine,
  Martini,
  GlassWater,
  Citrus,
  Milk,
  Wheat,
  Cherry,
  Carrot,
  Package,
  ShoppingBasket,
  Crown,
}

export function getLucideIconComponent(name?: string | null): LucideIcon {
  if (!name) return UtensilsCrossed
  return LUCIDE_ICON_MAP[name] || UtensilsCrossed
}

export interface CategoryIconProps {
  iconUrl?: string | null
  iconType?: CategoryIconType
  iconScale?: number
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
  iconScale = 100,
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

  const safeScale = normalizeCategoryIconScale(iconScale)
  const scaleFactor = safeScale / 100

  const shouldShowImage =
    iconType !== "lucide" && Boolean(iconUrl) && isSafeIconUrl(iconUrl) && !imgError

  if (shouldShowImage && iconUrl) {
    return (
      <span
        aria-hidden={alt === "" ? true : undefined}
        className={`${sizeClassName} relative inline-flex shrink-0 items-center justify-center overflow-hidden select-none ${className}`}
      >
        <img
          src={iconUrl}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
          className="w-full h-full object-contain select-none"
          style={safeScale !== 100 ? { transform: `scale(${scaleFactor})` } : undefined}
        />
      </span>
    )
  }

  const IconComp = getLucideIconComponent(fallbackIcon)
  const rawColor = (accentColor || "").trim()
  const color = /^#[0-9a-fA-F]{6}$/.test(rawColor) ? rawColor : "#E3A008"
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
