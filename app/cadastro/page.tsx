"use client"

import { Suspense } from "react"
import { AuthContainer } from "../login/auth-container"
import { AuthSkeleton } from "@/components/skeletons/auth-skeleton"

export default function RegisterPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <AuthContainer initialMode="register" />
    </Suspense>
  )
}
