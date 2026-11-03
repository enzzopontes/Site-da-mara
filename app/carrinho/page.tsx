"use client"

import { HeaderWrapper } from "@/components/header-wrapper"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AuthModal } from "@/components/auth-modal"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, ShoppingCart, ChevronRight, Clock } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

export default function CarrinhoPage() {
  const { items, updateQuantity, removeItem, getTotalPrice } = useCart()
  const { user } = useAuth()
  const router = useRouter()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [isStoreOpen, setIsStoreOpen] = useState(true)
  const [loadingStatus, setLoadingStatus] = useState(true)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { storeStatusManager } = await import("@/lib/store-status-manager")
        const status = await storeStatusManager.getStatus()
        setIsStoreOpen(status.isOpen)
      } catch (error) {
        console.error("Erro ao verificar status da loja:", error)
      } finally {
        setLoadingStatus(false)
      }
    }
    checkStatus()
  }, [])

  const handleFinalizarPedido = () => {
    if (!isStoreOpen) return
    if (items.length === 0) return
    if (!user) {
      setShowLoginModal(true)
      return
    }
    router.push("/checkout")
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <HeaderWrapper />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center py-16 px-4 max-w-md flex flex-col items-center">
            <img
              src="/assets/pedidos.png"
              alt="Sua sacola está vazia"
              className="w-48 h-48 object-contain mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-[#1F1B16] text-center mb-2">
              Sua sacola está vazia
            </h1>
            <p className="text-sm text-[#6B6157] text-center max-w-sm mb-6">
              Que tal adicionar algumas deliciosas batatas recheadas para começar?
            </p>
            <Button
              onClick={() => router.push("/cardapio")}
              className="bg-[#E3A008] hover:bg-[#B5860A] text-white font-bold px-8 py-3 rounded-xl shadow-none transition-colors h-auto"
            >
              Ver cardápio
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <HeaderWrapper />
      <main className="flex-1 py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => router.push("/cardapio")} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-yellow-500">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-2xl md:text-3xl font-black text-gray-800">Meu Carrinho</h1>
          </div>

          {/* AVISO DE LOJA FECHADA ESTILO IFOOD */}
          {!isStoreOpen && !loadingStatus && (
            <div className="mb-8 bg-yellow-50 border-2 border-yellow-200 rounded-3xl p-6 flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="bg-yellow-500 p-3 rounded-2xl flex-shrink-0">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black text-yellow-800 leading-tight mb-1">Loja Fechada no Momento</h3>
                <p className="text-yellow-700 font-bold text-sm leading-relaxed">
                  Estamos descansando para preparar as melhores batatas para você em breve! 
                  Você pode montar seu carrinho, mas a finalização estará disponível apenas quando abrirmos.
                </p>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            {/* LISTA DE ITENS */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item, index) => {
                const itemAdicionaisTotal = item.adicionais.reduce((sum, a) => sum + (a.price * a.quantity), 0)
                const itemTotal = (item.price + itemAdicionaisTotal) * item.quantity
                return (
                  <Card key={`${item.id}-${index}`} className="border-none shadow-sm rounded-2xl overflow-hidden">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex gap-4 md:gap-6">
                        <div className="w-20 h-20 md:w-28 md:h-28 flex-shrink-0 rounded-2xl overflow-hidden bg-gray-100 border border-gray-50">
                          <img src={item.image || "/placeholder.jpg"} alt={item.name} className="w-full h-full object-cover" />
                        </div>

                        <div className="flex-1 flex flex-col">
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <h3 className="font-black text-gray-800 text-lg leading-tight">{item.name}</h3>
                              {item.pastaType && (
                                <p className="text-xs text-yellow-600 font-bold mt-0.5">
                                  Massa: {item.pastaType === "penne" ? "Penne 🍝" : item.pastaType === "parafuso" ? "Parafuso 🌀" : "Espaguete 🍜"}
                                </p>
                              )}
                            </div>
                            <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                          
                          {item.adicionais.length > 0 && (
                            <div className="mb-3">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Adicionais:</p>
                              <div className="flex flex-wrap gap-1">
                                {item.adicionais.map((a, idx) => (
                                  <span key={idx} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">
                                    {a.quantity}x {a.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="mt-auto flex items-center justify-between">
                            <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-100">
                              <button 
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="h-8 w-8 flex items-center justify-center text-yellow-600 hover:bg-white rounded-lg transition-all"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="font-black w-8 text-center text-gray-700">{item.quantity}</span>
                              <button 
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="h-8 w-8 flex items-center justify-center text-yellow-600 hover:bg-white rounded-lg transition-all"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                            <span className="font-black text-lg text-gray-800">R$ {itemTotal.toFixed(2).replace('.', ',')}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              <Link href="/cardapio" className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-bold hover:border-yellow-500 hover:text-yellow-500 transition-all group">
                <Plus className="h-5 w-5" />
                Adicionar mais itens
              </Link>
            </div>

            {/* RESUMO DO PEDIDO */}
            <div className="lg:col-span-1">
              <Card className="border-none shadow-xl rounded-3xl overflow-hidden sticky top-28">
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-black text-gray-800 mb-6">Resumo</h2>
                  
                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between text-gray-500 font-bold">
                      <span>Subtotal</span>
                      <span>R$ {getTotalPrice().toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div className="flex justify-between text-gray-500 font-bold">
                      <span>Taxa de entrega</span>
                      <span className="text-green-600">Grátis</span>
                    </div>
                    <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                      <span className="text-lg font-black text-gray-800">Total</span>
                      <span className="text-2xl font-black text-yellow-500">R$ {getTotalPrice().toFixed(2).replace('.', ',')}</span>
                    </div>
                  </div>

                  <Button 
                    onClick={handleFinalizarPedido}
                    disabled={!isStoreOpen || loadingStatus}
                    className={`w-full h-16 font-black text-lg rounded-2xl shadow-lg flex items-center justify-center gap-2 group transition-all ${
                      isStoreOpen 
                        ? "bg-yellow-500 hover:bg-yellow-600 text-white shadow-yellow-100" 
                        : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                    }`}
                  >
                    {isStoreOpen ? (
                      <>
                        Escolher endereço
                        <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    ) : (
                      "Loja Fechada"
                    )}
                  </Button>

                  <p className="text-[11px] text-gray-400 font-bold text-center mt-6 uppercase tracking-widest">
                    Finalize no WhatsApp em seguida
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      <AuthModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />
    </div>
  )
}