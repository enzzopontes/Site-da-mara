"use client"

import { Suspense } from "react"
import { CardapioContent } from "./cardapio-content"
import { CardapioSkeleton } from "@/components/skeletons/cardapio-skeleton"

interface Product {
  id: string
  name: string
  description: string
  price: number
  image: string
  category?: "batata" | "bebida" | "macarrao"
}

interface CardapioContentProps {
  batatas: Product[]
  macarrao: Product[]
  bebidas: Product[]
  topBatatasNames?: string[]
  topMacarraoNames?: string[]
}

export function CardapioContentWrapper(props: CardapioContentProps) {
  return (
    <Suspense fallback={<CardapioSkeleton />}>
      <CardapioContent {...props} />
    </Suspense>
  )
}
