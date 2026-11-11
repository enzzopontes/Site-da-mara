import type React from "react"
import type { Metadata } from "next"
import { Geist } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { CartProvider } from "@/lib/cart-context"
import { AuthProvider } from "@/lib/auth-context"
import { OfflineDetector } from "@/components/offline-detector"
import { MobileNavbar } from "@/components/mobile-navbar"
import { CartBar } from "@/components/cart-bar"
import { GuestTopbar } from "@/components/guest-topbar"
import { CookieConsent } from "@/components/cookie-consent"
import "./globals.css"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "batata top - Batatas Recheadas Delivery",
  description: "As melhores batatas recheadas da cidade! Peça agora pelo delivery.",
  generator: "Enzzo Baraldo",
  icons: {
    icon: [
      {
        url: "/images/favicon.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/images/favicon.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/images/favicon.png",
        type: "(prefers-color-scheme: dark)",
      },
    ],
    apple: "/images/favicon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${geist.className} font-sans antialiased`}>
        <AuthProvider>
          <CartProvider>
            <OfflineDetector>
              {children}
              <CartBar />
              <GuestTopbar />
              <MobileNavbar />
              <Toaster position="top-center" />
              <CookieConsent />
            </OfflineDetector>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
