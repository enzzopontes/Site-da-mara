"use client"

import Link from "next/link"
import { Phone, Instagram, MapPin, Clock, Heart, Facebook, Twitter, Youtube } from "lucide-react"
import Image from "next/image"

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">

          {/* Logo e Descrição */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 sm:w-14 sm:h-14 relative flex-shrink-0">
                <Image
                  src="/logo.png"
                  alt="batata top Delivery"
                  fill
                  className="rounded-full object-contain pointer-events-none"
                  priority
                />
              </div>
              <div className="text-2xl font-black tracking-tighter text-gray-900">
                BATA<span className="text-yellow-500">TOP</span>
              </div>
            </Link>
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
              As melhores batatas recheadas de Iacanga. Qualidade, sabor e entrega rápida na sua porta.
            </p>
            <div className="flex gap-3">
              <a
                href="https://www.instagram.com/batatatop_1/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-yellow-500 hover:text-white flex items-center justify-center transition-all duration-300"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://wa.me/5514997361015"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-green-500 hover:text-white flex items-center justify-center transition-all duration-300"
                aria-label="WhatsApp"
              >
                <Phone className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* batata top */}
          <div>
            <h3 className="text-gray-900 font-black text-sm uppercase tracking-widest mb-6">
              batata top
            </h3>
            <ul className="space-y-4">
              <li>
                <Link href="/" className="text-gray-500 hover:text-yellow-500 transition-colors text-sm font-bold">
                  Início
                </Link>
              </li>
              <li>
                <Link href="/cardapio" className="text-gray-500 hover:text-yellow-500 transition-colors text-sm font-bold">
                  Cardápio
                </Link>
              </li>
              <li>
                <Link href="/sobre" className="text-gray-500 hover:text-yellow-500 transition-colors text-sm font-bold">
                  Nossa História
                </Link>
              </li>
              <li>
                <Link href="/contato" className="text-gray-500 hover:text-yellow-500 transition-colors text-sm font-bold">
                  Fale Conosco
                </Link>
              </li>
            </ul>
          </div>

          {/* Descubra */}
          <div>
            <h3 className="text-gray-900 font-black text-sm uppercase tracking-widest mb-6">
              Descubra
            </h3>
            <ul className="space-y-4">
              <li>
                <Link href="/cadastro" className="text-gray-500 hover:text-yellow-500 transition-colors text-sm font-bold">
                  Cadastre-se
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-gray-500 hover:text-yellow-500 transition-colors text-sm font-bold">
                  Login
                </Link>
              </li>
              <li>
                <Link href="/perfil" className="text-gray-500 hover:text-yellow-500 transition-colors text-sm font-bold">
                  Meus Pedidos
                </Link>
              </li>
              <li>
                <Link href="/carrinho" className="text-gray-500 hover:text-yellow-500 transition-colors text-sm font-bold">
                  Carrinho
                </Link>
              </li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h3 className="text-gray-900 font-black text-sm uppercase tracking-widest mb-6">
              Contato
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-gray-500 text-sm">
                <MapPin className="h-5 w-5 text-yellow-500 shrink-0" />
                <span className="font-bold">Iacanga - SP e Região</span>
              </li>
              <li className="flex items-start gap-3 text-gray-500 text-sm">
                <Clock className="h-5 w-5 text-yellow-500 shrink-0" />
                <div>
                  <p className="font-black text-gray-900">Segunda a Segunda</p>
                  <p className="font-bold">10:00 às 01:30</p>
                </div>
              </li>
              <li className="flex items-center gap-3 text-gray-500 text-sm">
                <Phone className="h-5 w-5 text-yellow-500 shrink-0" />
                <span className="font-bold">(14) 99736-1015</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Rodapé Inferior */}
        <div className="border-t border-gray-100 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="relative w-8 h-8 grayscale opacity-50 flex-shrink-0">
                <Image
                  src="/logo.png"
                  alt="batata top"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="text-[11px] text-gray-400 font-bold">
                © {new Date().getFullYear()} batata top DELIVERY. TODOS OS DIREITOS RESERVADOS.
              </div>
            </div>

            <div className="flex items-center gap-6 sm:gap-8 flex-wrap">
              <Link href="/termos" className="text-[11px] text-gray-400 hover:text-gray-900 font-bold transition-colors uppercase tracking-tighter">
                Termos de Uso
              </Link>
              <Link href="/privacidade" className="text-[11px] text-gray-400 hover:text-gray-900 font-bold transition-colors uppercase tracking-tighter">
                Privacidade
              </Link>
              <Link href="/excluir-conta" className="text-[11px] text-gray-400 hover:text-gray-900 font-bold transition-colors uppercase tracking-tighter">
                Excluir Conta
              </Link>
              <div className="flex items-center gap-1 text-[11px] text-gray-400 font-bold uppercase tracking-tighter">
                FEITO COM <Heart className="h-3 w-3 text-red-500 fill-current" /> POR ENZZO BARALDO
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
