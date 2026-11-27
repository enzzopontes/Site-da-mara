"use client"

import { Suspense } from "react"
import { CardapioContent } from "./cardapio-content"
import { CardapioSkeleton } from "@/components/skeletons/cardapio-skeleton"
import type { Category } from "@/lib/categories-db"
import type { Product } from "@/lib/products-db"

export interface MenuSectionData {
  category: Category
  products: Product[]
  topNames: string[]
}

export interface CardapioContentProps {
  sections: MenuSectionData[]
  todosCategory?: Category | null
  loadError?: string | null
}

export function CardapioContentWrapper({ sections, todosCategory, loadError }: CardapioContentProps) {
  return (
    <Suspense fallback={<CardapioSkeleton />}>
      <CardapioContent sections={sections} todosCategory={todosCategory} loadError={loadError} />
    </Suspense>
  )
}
