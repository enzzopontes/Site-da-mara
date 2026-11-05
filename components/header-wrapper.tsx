"use client"

import { Suspense } from "react"
import { usePathname } from "next/navigation"
import { Header } from "./header"

interface HeaderProps {
  variant?: "default" | "simple"
}

function HeaderFallback({ variant = "default" }: HeaderProps) {
  if (variant === "simple") {
    return (
      <header className="w-full bg-[#FFFFFF] border-b border-[#ECE7E0] h-16 sticky top-0 z-40 flex items-center">
        <div className="container mx-auto px-4 flex justify-center">
          <div className="w-11 h-11 bg-[#F3F0EB] rounded-full animate-pulse" />
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-[#FFFFFF] border-b border-[#ECE7E0]">
      <div className="max-w-7xl mx-auto h-16 px-4 sm:px-8 flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1.5 py-0.5">
          <div className="h-3 w-24 bg-[#F3F0EB] rounded animate-pulse" />
          <div className="h-4 w-36 sm:w-44 bg-[#F3F0EB] rounded animate-pulse" />
        </div>
        <div className="h-5 w-16 bg-[#F3F0EB] rounded-full animate-pulse" />
        <div className="w-10 h-10 bg-[#F3F0EB] rounded-full animate-pulse" />
      </div>
    </header>
  )
}

export function HeaderWrapper(props: HeaderProps) {
  const pathname = usePathname()

  // Exibir apenas na Home ("/") de acordo com as regras de visibilidade
  if (pathname !== "/") {
    return null
  }

  return (
    <Suspense fallback={<HeaderFallback {...props} />}>
      <Header {...props} />
    </Suspense>
  )
}
