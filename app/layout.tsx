import type React from "react"
import type { Metadata } from "next"
import { Geist } from "next/font/google"
import { ThemedAlertHost } from "@/components/notifications/themed-alert-host"
import { CartProvider } from "@/lib/cart-context"
import { AuthProvider } from "@/lib/auth-context"
import { OfflineDetector } from "@/components/offline-detector"
import { MobileNavbar } from "@/components/mobile-navbar"
import { CartBar } from "@/components/cart-bar"
import { GuestTopbar } from "@/components/guest-topbar"
import { AuthModal } from "@/components/auth-modal"
import { CookieConsent } from "@/components/cookie-consent"
import { MetaPixel } from "@/components/meta-pixel"
import "./globals.css"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "batata top - Batatas Recheadas Delivery",
  description: "As melhores batatas recheadas da cidade! Peça agora pelo delivery.",
  generator: "Enzzo Baraldo",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
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
        <MetaPixel />
        <AuthProvider>
          <CartProvider>
            <OfflineDetector>
              {children}
              <CartBar />
              <GuestTopbar />
              <MobileNavbar />
              <AuthModal />
              <CookieConsent />
            </OfflineDetector>
            <ThemedAlertHost />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
