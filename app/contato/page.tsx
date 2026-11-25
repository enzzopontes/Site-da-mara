"use client"

import { HeaderWrapper } from "@/components/header-wrapper"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Phone, Mail, MapPin, Clock, MessageCircle, Instagram, Send, ExternalLink } from "lucide-react"
import Image from "next/image"

export default function ContatoPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <HeaderWrapper />
      
      <main className="flex-1">
        {/* Hero Section Simplificada */}
        <section className="py-16 bg-gray-50 border-b border-gray-100">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-4 tracking-tighter">
              Fale com a <span className="text-yellow-500">batata top</span>
            </h1>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto font-medium">
              Dúvidas, sugestões ou apenas quer bater um papo sobre batatas? Estamos aqui para você!
            </p>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Card WhatsApp - O Principal */}
              <div className="lg:col-span-2 bg-white border-2 border-yellow-100 rounded-3xl p-8 md:p-12 shadow-xl shadow-yellow-50 flex flex-col md:flex-row items-center gap-8 transition-transform hover:scale-[1.01]">
                <div className="relative w-24 h-24 md:w-32 md:h-32 flex-shrink-0">
                  <Image
                    src="/logo.png"
                    alt="batata top"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-black uppercase tracking-widest mb-4">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Online Agora
                  </div>
                  <h2 className="text-3xl font-black text-gray-900 mb-4">Atendimento via WhatsApp</h2>
                  <p className="text-gray-500 font-medium mb-8 leading-relaxed">
                    Nossa equipe está pronta para te atender. Clique no botão abaixo para iniciar uma conversa agora mesmo!
                  </p>
                  <a href="https://wa.me/5514997361015" target="_blank" rel="noopener noreferrer">
                    <Button className="w-full md:w-auto bg-green-500 hover:bg-green-600 text-white font-black text-lg px-10 h-14 rounded-2xl shadow-lg shadow-green-100 flex items-center justify-center gap-3">
                      <MessageCircle className="h-6 w-6" />
                      CHAMAR NO WHATSAPP
                    </Button>
                  </a>
                </div>
              </div>

              {/* Outros Contatos */}
              <div className="space-y-6">
                {/* Instagram */}
                <a 
                  href="https://www.instagram.com/batatatop_1/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <div className="bg-white border border-gray-100 rounded-3xl p-6 flex items-center gap-4 transition-all group-hover:border-pink-200 group-hover:bg-pink-50/30">
                    <div className="w-14 h-14 rounded-2xl bg-pink-50 text-pink-500 flex items-center justify-center group-hover:bg-pink-500 group-hover:text-white transition-all">
                      <Instagram className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Instagram</p>
                      <p className="text-lg font-black text-gray-900">@batatatop_1</p>
                    </div>
                  </div>
                </a>

                {/* Email */}
                <a
                  href="mailto:maraysis9010@gmail.com"
                  className="block group"
                >
                  <div className="bg-white border border-gray-100 rounded-3xl p-6 flex items-center gap-4 transition-all group-hover:border-[#E3A008]/40 group-hover:bg-[#FFFBF2]">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 group-hover:bg-[#E3A008] group-hover:text-white transition-all">
                      <Mail className="h-7 w-7" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">E-mail</p>
                      <p className="text-base md:text-lg font-black text-gray-900 break-all">maraysis9010@gmail.com</p>
                    </div>
                  </div>
                </a>

                {/* Horário */}
                <div className="bg-gray-900 rounded-3xl p-8 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Clock className="w-24 h-24" />
                  </div>
                  <p className="text-xs font-black text-yellow-500 uppercase tracking-widest mb-4">Horário de Funcionamento</p>
                  <div className="space-y-2">
                    <p className="text-xl font-black">Segunda a Segunda</p>
                    <p className="text-3xl font-black text-yellow-500">10:00 às 22:30</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Localização */}
            <div className="mt-12 bg-white border border-gray-100 rounded-3xl p-8 md:p-12">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="text-center md:text-left">
                  <div className="w-16 h-16 rounded-2xl bg-[#E3A008]/10 text-[#E3A008] flex items-center justify-center mb-6 mx-auto md:mx-0">
                    <MapPin className="h-8 w-8" />
                  </div>
                  <h2 className="text-3xl font-black text-gray-900 mb-2">Onde estamos</h2>
                  <p className="text-gray-600 font-medium">Iacanga - SP</p>
                  <p className="text-gray-400 text-sm mt-4">Atendemos toda a cidade com delivery rápido ou retirada no local!</p>
                </div>
                <div className="w-full md:w-1/2 bg-[#F7F5F0] rounded-2xl border border-[#ECE7E0] p-6 md:p-8 flex flex-col justify-between gap-5">
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E3A008]/15 text-[#C1440E] text-xs font-black uppercase tracking-wider">
                      <MapPin className="h-3.5 w-3.5" />
                      Retirada no Local
                    </span>
                    <p className="text-lg font-black text-gray-900 leading-snug pt-1">
                      Rua Carlos Roberto Crepaldi, 120 - Centro, Iacanga - SP
                    </p>
                    <p className="text-sm font-semibold text-[#C1440E]">
                      Referência: Portão de ferro preto
                    </p>
                  </div>
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=Rua+Carlos+Roberto+Crepaldi,+120,+Centro,+Iacanga+-+SP"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex"
                  >
                    <Button className="w-full sm:w-auto bg-[#E3A008] hover:bg-[#C1440E] text-white font-black rounded-xl px-6 h-12 flex items-center justify-center gap-2 transition-colors">
                      <MapPin className="h-4 w-4" />
                      Abrir no Google Maps
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
