"use client"

import { HeaderWrapper } from "@/components/header-wrapper"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { MessageCircle, Phone, Clock, ArrowLeft, ChevronRight, Package, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { AjudaSkeleton } from "@/components/skeletons/ajuda-skeleton"
import { useState } from "react"
import { OrderSummary } from "@/components/order-summary"
import Link from "next/link"

export default function AjudaPage() {
  const { loading } = useAuth()
  const router = useRouter()
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const faqItems: Array<{
    question: string
    answer: string
    link?: { href: string; label: string }
    showWhatsApp?: boolean
  }> = [
    {
      question: "Como faço um pedido e quais formas de pagamento aceitam?",
      answer:
        "Navegue pelo cardápio, escolha suas batatas, adicione à sacola e finalize no checkout. Aceitamos PIX online, Cartão de Crédito ou Débito online (via Mercado Pago) e pagamento na entrega (Dinheiro com opção de troco ou Cartão).",
    },
    {
      question: "Qual o tempo de entrega?",
      answer:
        "O tempo médio de entrega em Iacanga - SP é de 30 a 45 minutos, variando conforme a demanda. Se preferir, a retirada no local é mais rápida no Portão de Ferro Preto — Rua Carlos Roberto Crepaldi, 120 - Centro.",
    },
    {
      question: "Como adiciono ou altero meu endereço?",
      answer:
        "Você pode gerenciar seus endereços em Perfil > Endereços ou diretamente pelo seletor de endereço no topo do site. Realizamos entregas em Iacanga - SP.",
    },
    {
      question: "Posso cancelar meu pedido ou relatar um pedido errado?",
      answer:
        "Você pode cancelar o pedido antes do início do preparo diretamente no detalhe do pedido. Em caso de pedido errado, incompleto ou com avaria, entre em contato em até 2 horas após o recebimento, conforme nossa Política de Reembolso.",
      link: { href: "/reembolso", label: "Ver Política de Reembolso" },
    },
    {
      question: "Como uso um cupom de desconto?",
      answer:
        "Os cupons podem ser aplicados na página de Cupons ou diretamente no checkout antes de finalizar o pedido. Os cupons não são acumuláveis com promoções ativas.",
      link: { href: "/cupons", label: "Ver Cupons disponíveis" },
    },
    {
      question: "Não estou achando meu endereço",
      answer:
        "Se o seu endereço não aparece ou o CEP não é reconhecido, verifique se ele está dentro de Iacanga - SP. Caso esteja tudo correto e ainda assim não consiga cadastrar, entre em contato conosco pelo nosso WhatsApp oficial para que possamos te ajudar e realizar seu pedido manualmente.",
      showWhatsApp: true,
    },
  ]

  const contactOptions = [
    {
      icon: MessageCircle,
      title: "WhatsApp",
      value: "(14) 99736-1015",
      action: () => window.open("https://wa.me/5514997361015", "_blank"),
      bgClass: "bg-[#22C55E]/10",
      iconClass: "text-[#22C55E]",
    },
    {
      icon: Phone,
      title: "Telefone",
      value: "(14) 99736-1015",
      action: () => { window.location.href = "tel:+5514997361015" },
      bgClass: "bg-[#E3A008]/10",
      iconClass: "text-[#E3A008]",
    },
  ]

  const quickLinks = [
    {
      icon: Package,
      title: "Meus Pedidos",
      href: "/pedidos",
      bgClass: "bg-[#E3A008]/10",
      iconClass: "text-[#E3A008]",
    },
    {
      icon: AlertCircle,
      title: "Problemas",
      href: "/contato",
      bgClass: "bg-[#C1440E]/10",
      iconClass: "text-[#C1440E]",
    },
  ]

  if (loading) {
    return <AjudaSkeleton />
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5F0]">
      <HeaderWrapper />
      <main className="flex-1 py-8 pb-24 lg:pb-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full active:scale-[0.98] transition-transform">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-black text-gray-800">Ajuda</h1>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {quickLinks.map((link, index) => (
              <Link key={index} href={link.href} className="block active:scale-[0.98] transition-transform">
                <div className="bg-white rounded-xl p-4 border border-[#ECE7E0] flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full ${link.bgClass} flex items-center justify-center`}>
                    <link.icon className={`h-5 w-5 ${link.iconClass}`} />
                  </div>
                  <p className="text-sm font-bold text-gray-800">{link.title}</p>
                </div>
              </Link>
            ))}
          </div>

          <div className="space-y-3 mb-6">
            {contactOptions.map((option, index) => (
              <button key={index} onClick={option.action} className="w-full bg-white rounded-xl p-4 border border-[#ECE7E0] flex items-center justify-between active:scale-[0.98] transition-transform">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-full ${option.bgClass} flex items-center justify-center`}>
                    <option.icon className={`h-6 w-6 ${option.iconClass}`} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-800">{option.title}</p>
                    <p className="text-sm font-bold text-[#E3A008]">{option.value}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-300" />
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-6 mb-6 border border-[#ECE7E0]">
            <h3 className="font-black text-gray-800 mb-4">Dúvidas Frequentes</h3>
            <div className="space-y-3">
              {faqItems.map((item, index) => (
                <div key={index} className="border-b border-[#ECE7E0] last:border-0 pb-3 last:pb-0">
                  <button onClick={() => setExpandedFaq(expandedFaq === index ? null : index)} className="w-full text-left flex items-center justify-between gap-3 py-2 active:scale-[0.98] transition-transform">
                    <span className={`font-bold text-sm transition-colors ${expandedFaq === index ? 'text-[#C1440E]' : 'text-gray-800'}`}>{item.question}</span>
                    <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${expandedFaq === index ? 'rotate-90 text-[#E3A008]' : 'text-gray-400'}`} />
                  </button>
                  {expandedFaq === index && (
                    <div className="animate-in fade-in slide-in-from-top-1">
                      <p className="text-sm text-gray-600 leading-relaxed mt-2">{item.answer}</p>
                      {item.link && (
                        <Link
                          href={item.link.href}
                          className="inline-flex items-center gap-1 mt-3 text-sm font-bold text-[#C1440E] hover:text-[#E3A008] transition-colors"
                        >
                          {item.link.label}
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      )}
                      {item.showWhatsApp && (
                        <Button 
                          onClick={() => window.open("https://wa.me/5514997361015", "_blank")}
                          className="mt-4 w-full bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold gap-2 active:scale-[0.98] transition-transform"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Falar com a Batata Top
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#ECE7E0]">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-5 w-5 text-[#E3A008]" />
              <p className="font-bold text-gray-800">Horário</p>
            </div>
            <p className="text-sm text-gray-600">Segunda a Segunda: 10:00 às 22:30</p>
          </div>
        </div>
      </main>
      <Footer />
      <OrderSummary />
    </div>
  )
}
