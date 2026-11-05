"use client"

import React from "react"

export function CuponsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border border-[#ECE7E0] rounded-2xl bg-white p-4 space-y-3 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gray-200" />
              <div className="space-y-1.5">
                <div className="w-24 h-5 rounded-md bg-gray-200" />
                <div className="w-36 h-3.5 rounded-md bg-gray-200" />
              </div>
            </div>
            <div className="w-7 h-7 rounded-full bg-gray-200" />
          </div>
          <div className="w-48 h-3 rounded-md bg-gray-200" />
          <div className="border-t border-dashed border-gray-200 pt-2 flex justify-between">
            <div className="w-16 h-3 rounded-md bg-gray-200" />
            <div className="w-20 h-3 rounded-md bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  )
}
