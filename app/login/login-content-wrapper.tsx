"use client"

import { Suspense } from "react"
import { LoginContent } from "./login-content"

function LoginContentFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1F1B16]"></div>
    </div>
  )
}

export function LoginContentWrapper() {
  return (
    <Suspense fallback={<LoginContentFallback />}>
      <LoginContent />
    </Suspense>
  )
}
