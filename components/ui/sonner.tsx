"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2 } from "lucide-react"

export const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "light" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-zinc-900 group-[.toaster]:border-zinc-200/80 group-[.toaster]:shadow-xl group-[.toaster]:rounded-2xl group-[.toaster]:p-3.5 group-[.toaster]:gap-3 group-[.toaster]:font-sans",
          title: "group-[.toast]:font-semibold group-[.toast]:text-sm group-[.toast]:text-zinc-900 leading-snug",
          description: "group-[.toast]:text-xs group-[.toast]:text-zinc-500 group-[.toast]:mt-0.5 leading-relaxed",
          actionButton:
            "group-[.toast]:bg-zinc-900 group-[.toast]:text-white group-[.toast]:rounded-xl group-[.toast]:text-xs group-[.toast]:font-medium group-[.toast]:px-3 group-[.toast]:py-1.5",
          cancelButton:
            "group-[.toast]:bg-zinc-100 group-[.toast]:text-zinc-600 group-[.toast]:rounded-xl group-[.toast]:text-xs group-[.toast]:font-medium group-[.toast]:px-3 group-[.toast]:py-1.5",
          closeButton:
            "group-[.toast]:bg-white group-[.toast]:border-zinc-200 group-[.toast]:text-zinc-500 hover:group-[.toast]:text-zinc-900",
          success: "group-[.toaster]:border-emerald-200/90",
          error: "group-[.toaster]:border-rose-200/90",
          warning: "group-[.toaster]:border-amber-200/90",
          info: "group-[.toaster]:border-sky-200/90",
        },
      }}
      icons={{
        success: <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />,
        error: <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />,
        warning: <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />,
        info: <Info className="h-5 w-5 text-sky-500 shrink-0" />,
        loading: <Loader2 className="h-5 w-5 text-zinc-400 animate-spin shrink-0" />,
      }}
      {...props}
    />
  )
}
