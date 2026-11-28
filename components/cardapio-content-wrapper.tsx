"use client"

import { Suspense } from "react"
import { CardapioContent } from "./cardapio-content"
import { CardapioSkeleton } from "@/components/skeletons/cardapio-skeleton"
import type { Category } from "@/lib/categories-db"
import type { HomeGridLayout } from "@/lib/home-grid-layout"
import type { Product } from "@/lib/products-db"

export interface MenuSectionData {
  category: Category
  products: Product[]
  topNames: string[]
}

export interface CardapioContentProps {
  sections: MenuSectionData[]
  todosCategory?: Category | null
  homeGridLayout?: HomeGridLayout
  loadError?: string | null
}

export function CardapioContentWrapper({
  sections,
  todosCategory,
  homeGridLayout,
  loadError,
}: CardapioContentProps) {
  return (
    <Suspense fallback={<CardapioSkeleton />}>
      <CardapioContent
        sections={sections}
        todosCategory={todosCategory}
        homeGridLayout={homeGridLayout}
        loadError={loadError}
      />
    </Suspense>
  )
}
