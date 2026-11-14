"use client"

import { Suspense } from "react"
import { AuthContainer } from "./auth-container"

function AuthContainerFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1F1B16]"></div>
    </div>
  )
}

interface AuthContainerWrapperProps {
  initialMode?: "login" | "register"
}

export function AuthContainerWrapper({ initialMode = "login" }: AuthContainerWrapperProps) {
  return (
    <Suspense fallback={<AuthContainerFallback />}>
      <AuthContainer initialMode={initialMode} />
    </Suspense>
  )
}
