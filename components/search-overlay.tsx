"use client"

import { useState, useEffect } from "react"
import { Search, X, Utensils, Soup, Beer } from "lucide-react"
import Link from "next/link"

interface Product {
  id: string
  name: string
  description: string
  price: number
  image: string
  category?: "batata" | "bebida" | "macarrao"
}

interface SearchOverlayProps {
  isOpen: boolean
  onClose: () => void
  batatas: Product[]
  macarrao: Product[]
  bebidas: Product[]
}

export function SearchOverlay({ isOpen, onClose, batatas, macarrao, bebidas }: SearchOverlayProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("batatas")
  const [filteredResults, setFilteredResults] = useState<Product[]>([])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredResults([])
      return
    }

    const normalize = (str: string) =>
      str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

    const term = normalize(searchQuery)
    let results: Product[] = []

    if (activeTab === "batatas") {
      results = batatas.filter(
        (p) =>
          normalize(p.name).includes(term) ||
          normalize(p.description).includes(term)
      )
    } else if (activeTab === "macarrao") {
      results = macarrao.filter(
        (p) =>
          normalize(p.name).includes(term) ||
          normalize(p.description).includes(term)
      )
    } else if (activeTab === "bebidas") {
      results = bebidas.filter(
        (p) =>
          normalize(p.name).includes(term) ||
          normalize(p.description).includes(term)
      )
    }

    setFilteredResults(results)
  }, [searchQuery, activeTab, batatas, macarrao, bebidas])

  if (!isOpen) return null

  const categories = [
    { id: "batatas", label: "Batatas", icon: Utensils, count: batatas.length },
    { id: "macarrao", label: "Macarrão", icon: Soup, count: macarrao.length },
    { id: "bebidas", label: "Bebidas", icon: Beer, count: bebidas.length },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={onClose}>
      <div
        className="absolute inset-x-0 top-0 bg-white rounded-b-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-top duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com Input de Busca */}
        <div className="p-4 border-b bg-gradient-to-b from-yellow-50 to-white">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-yellow-500" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar batata, macarrão, bebida..."
                className="w-full h-11 pl-11 pr-4 bg-white border-2 border-yellow-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500 transition-colors"
              />
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Abas de Categorias */}
        <div className="flex items-center gap-2 px-4 py-3 border-b overflow-x-auto scrollbar-hide bg-white">
          {categories.map((cat) => {
            const Icon = cat.icon
            const isActive = activeTab === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all ${
                  isActive
                    ? "bg-yellow-100 text-yellow-600"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                {cat.label}
              </button>
            )
          })}
        </div>

        {/* Resultados de Busca */}
        <div className="flex-1 overflow-y-auto">
          {searchQuery.trim() === "" ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Search className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 text-center">
                Digite para buscar no cardápio
              </p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <X className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 text-center">
                Nenhum resultado encontrado
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-4">
              {filteredResults.map((product) => (
                <Link
                  key={product.id}
                  href={`/cardapio?q=${encodeURIComponent(product.name)}`}
                  onClick={onClose}
                  className="group"
                >
                  <div className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-all">
                    <div className="relative h-24 bg-gray-100 overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-bold text-gray-800 line-clamp-2">
                        {product.name}
                      </p>
                      <p className="text-xs text-yellow-600 font-black mt-2">
                        R$ {product.price.toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
