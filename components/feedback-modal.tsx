"use client"

import { useState } from "react"
import { X, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase-fix"
import { useAuth } from "@/lib/auth-context"

interface FeedbackModalProps {
  orderId: string
  orderNumber: string
  initialRating?: number
  onClose: () => void
  onSuccess?: () => void
}

export function FeedbackModal({ orderId, orderNumber, initialRating = 0, onClose, onSuccess }: FeedbackModalProps) {
  const { user } = useAuth()
  const [rating, setRating] = useState(initialRating)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) {
      alert("Por favor, selecione uma avaliação de 1 a 5 estrelas")
      return
    }

    setIsSubmitting(true)

    try {
      const feedbackData = {
        order_id: orderId,
        user_id: user?.id || null,
        customer_name: user?.user_metadata?.full_name || "Cliente",
        customer_phone: user?.user_metadata?.phone || "",
        rating,
        comment: comment.trim() || null,
      }

      const { error } = await supabase
        .from("feedbacks")
        .insert(feedbackData)

      if (error) throw error

      const evaluatedOrders = JSON.parse(localStorage.getItem("evaluated-orders") || "[]")
      if (!evaluatedOrders.includes(orderId)) {
        evaluatedOrders.push(orderId)
        localStorage.setItem("evaluated-orders", JSON.stringify(evaluatedOrders))
      }

      alert("Obrigado pela sua avaliação! 🎉")
      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error("Erro ao enviar feedback:", error)
      alert(`Erro ao enviar avaliação: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 border-t sm:border border-yellow-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-6 pb-8 relative flex-shrink-0">
          <div className="w-12 h-1.5 bg-white/30 rounded-full mx-auto mb-4 sm:hidden" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="h-6 w-6 text-white" />
          </button>
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-1 text-center sm:text-left">Avalie seu pedido</h2>
          <p className="text-yellow-50 text-sm font-bold text-center sm:text-left opacity-90">Pedido #{orderNumber}</p>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-6 sm:space-y-8 bg-white overflow-y-auto">
          {/* Rating Stars */}
          <div className="space-y-4">
            <label className="block text-base font-black text-gray-800 text-center">
              Como foi sua experiência?
            </label>
            <div className="flex justify-center gap-1 sm:gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-all hover:scale-125 active:scale-90 p-1 sm:p-2"
                >
                  <Star
                    className={`h-10 w-10 sm:h-12 sm:w-12 transition-all duration-200 ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]"
                        : "text-gray-200"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <div className="flex justify-center">
                <span className="px-4 py-1.5 bg-yellow-50 text-yellow-700 rounded-full text-sm font-black animate-in zoom-in duration-200">
                  {rating === 1 && "😞 Muito ruim"}
                  {rating === 2 && "😕 Ruim"}
                  {rating === 3 && "😐 Regular"}
                  {rating === 4 && "😊 Bom"}
                  {rating === 5 && "🤩 Excelente"}
                </span>
              </div>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-3">
            <label className="block text-sm font-black text-gray-700">
              Deixe um comentário (opcional)
            </label>
            <Textarea
              placeholder="O que podemos melhorar?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[100px] sm:min-h-[120px] resize-none border-2 border-gray-100 focus:border-yellow-400 rounded-2xl transition-all text-base p-4 focus:ring-0"
              maxLength={500}
            />
            <div className="flex justify-end">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {comment.length}/500
              </span>
            </div>
          </div>

          {/* Actions - Agora sempre em coluna para garantir a ordem Enviar -> Agora não */}
          <div className="flex flex-col gap-3 pt-2 pb-6 sm:pb-0">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || rating === 0}
              className="w-full h-14 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-black text-lg rounded-2xl shadow-xl shadow-yellow-100 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-3 border-gray-900 border-t-transparent" />
                  Enviando...
                </div>
              ) : (
                "Enviar Avaliação"
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full h-12 font-bold text-gray-400 hover:bg-gray-50 rounded-2xl"
              disabled={isSubmitting}
            >
              Agora não
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
