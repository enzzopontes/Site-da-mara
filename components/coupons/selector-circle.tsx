"use client"

import React from "react"

interface SelectorCircleProps {
  selected?: boolean
  disabled?: boolean
  size?: number
}

export function SelectorCircle({ selected, disabled, size = 28 }: SelectorCircleProps) {
  const dotSize = Math.round(size * 0.4)

  if (disabled) {
    return (
      <div
        className="rounded-full bg-[#F5F2ED] border border-[#ECE7E0] transition-colors"
        style={{ width: size, height: size }}
      />
    )
  }

  if (selected) {
    return (
      <div
        className="rounded-full bg-[#E3A008] flex items-center justify-center transition-colors shadow-xs"
        style={{ width: size, height: size }}
      >
        <div
          className="rounded-full bg-white"
          style={{ width: dotSize, height: dotSize }}
        />
      </div>
    )
  }

  return (
    <div
      className="rounded-full bg-[#F7F4EF] border border-[#ECE7E0] transition-colors hover:border-[#E3A008]"
      style={{ width: size, height: size }}
    />
  )
}
