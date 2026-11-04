"use client"

import { Suspense } from "react"
import { AuthContainer } from "./auth-container"
import { AuthSkeleton } from "@/components/skeletons/auth-skeleton"

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <AuthContainer initialMode="login" />
    </Suspense>
  )
}
