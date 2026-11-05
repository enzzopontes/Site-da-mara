"use client"

import React from "react"

interface TicketDividerProps {
  pageBackgroundColor?: string
  borderColor?: string
}

export function TicketDivider({
  pageBackgroundColor = "#FFFFFF",
  borderColor = "#ECE7E0",
}: TicketDividerProps) {
  const NOTCH_SIZE = 14
  const NOTCH_RADIUS = NOTCH_SIZE / 2

  return (
    <div
      className="relative w-full flex items-center bg-white"
      style={{ height: NOTCH_SIZE }}
    >
      {/* Mordida Esquerda */}
      <div
        className="absolute left-0 top-0 overflow-hidden z-10 pointer-events-none"
        style={{ width: NOTCH_RADIUS, height: NOTCH_SIZE }}
      >
        <div
          className="absolute rounded-full"
          style={{
            left: -NOTCH_RADIUS,
            top: 0,
            width: NOTCH_SIZE,
            height: NOTCH_SIZE,
            backgroundColor: pageBackgroundColor,
            border: `1.5px solid ${borderColor}`,
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Mordida Direita */}
      <div
        className="absolute right-0 top-0 overflow-hidden z-10 pointer-events-none"
        style={{ width: NOTCH_RADIUS, height: NOTCH_SIZE }}
      >
        <div
          className="absolute rounded-full"
          style={{
            right: -NOTCH_RADIUS,
            top: 0,
            width: NOTCH_SIZE,
            height: NOTCH_SIZE,
            backgroundColor: pageBackgroundColor,
            border: `1.5px solid ${borderColor}`,
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Linha tracejada central */}
      <div className="w-full mx-5 border-t border-dashed border-[#C5C5C5]" />
    </div>
  )
}
