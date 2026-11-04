import * as React from "react"
import { cn } from "@/lib/utils"

export interface SkeletonProps extends React.ComponentProps<"div"> {
  variant?: "default" | "circle" | "rounded" | "text" | "card" | "thumbnail"
}

function Skeleton({
  className,
  variant = "default",
  ...props
}: SkeletonProps) {
  const variantClasses = {
    default: "rounded-md",
    circle: "rounded-full",
    rounded: "rounded-2xl",
    text: "rounded h-4 w-full",
    card: "rounded-2xl border border-[#ECE7E0]/60",
    thumbnail: "rounded-xl aspect-[16/10]",
  }[variant]

  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        "skeleton-shimmer bg-[#EAE5DF]/90 select-none pointer-events-none",
        variantClasses,
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
