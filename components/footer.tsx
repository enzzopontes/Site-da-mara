"use client"

import Link from "next/link"
import { Phone, Instagram, MapPin, Clock, Heart, ShieldCheck, Mail } from "lucide-react"
import Image from "next/image"

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 pt-16 pb-8" role="contentinfo" aria-label="Rodapé do site">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">

          {/* Logo e Descrição */}
          <div className="space-y-6">
            <Link 
              href="/" 
              className="inline-block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 rounded-xl p-1 transition-transform hover:scale-[1.02]"
              aria-label="Batata Top - Página Inicial"
            >
              <div className="relative w-44 sm:w-52 h-16 sm:h-20">
                <Image
                  src="/images/batata-top-estendida.png"
                  alt="Batata Top Delivery"
                  fill
                  sizes="(max-width: 640px) 176px, 208px"
                  className="object-contain object-left pointer-events-none"
                  priority
                />
              </div>
            </Link>
            <p className="text-gray-600 text-sm leading-relaxed max-w-xs">
              As melhores batatas recheadas de Iacanga. Qualidade, sabor e entrega rápida na sua porta.
            </p>
            <div className="flex gap-3">
              <a
                href="https://www.instagram.com/batatatop_1/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 hover:bg-amber-600 hover:text-white flex items-center justify-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                aria-label="Acessar o perfil oficial do Batata Top no Instagram (abre em nova aba)"
              >
                <Instagram className="h-5 w-5" aria-hidden="true" />
              </a>
              <a
                href="https://wa.me/5514997361015"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 hover:bg-green-600 hover:text-white flex items-center justify-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
                aria-label="Conversar com o atendimento do Batata Top via WhatsApp (abre em nova aba)"
              >
                <Phone className="h-5 w-5" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Navegação Principal */}
          <div>
            <h3 className="text-gray-900 font-black text-sm uppercase tracking-widest mb-6">
              Batata Top
            </h3>
            <ul className="space-y-4">
              <li>
                <Link href="/" className="text-gray-600 hover:text-amber-700 transition-colors text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 rounded px-1">
                  Início
                </Link>
              </li>
              <li>
                <Link href="/cardapio" className="text-gray-600 hover:text-amber-700 transition-colors text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 rounded px-1">
                  Cardápio
                </Link>
              </li>
              <li>
                <Link href="/sobre" className="text-gray-600 hover:text-amber-700 transition-colors text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 rounded px-1">
                  Nossa História
                </Link>
              </li>
              <li>
                <Link href="/contato" className="text-gray-600 hover:text-amber-700 transition-colors text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 rounded px-1">
                  Fale Conosco
                </Link>
              </li>
            </ul>
          </div>

          {/* Links e Gestão de Conta */}
          <div>
            <h3 className="text-gray-900 font-black text-sm uppercase tracking-widest mb-6">
              Sua Conta
            </h3>
            <ul className="space-y-4">
              <li>
                <Link href="/cadastro" className="text-gray-600 hover:text-amber-700 transition-colors text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 rounded px-1">
                  Criar Conta
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-gray-600 hover:text-amber-700 transition-colors text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 rounded px-1">
                  Fazer Login
                </Link>
              </li>
              <li>
                <Link href="/meus-dados" className="text-gray-600 hover:text-amber-700 transition-colors text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 rounded px-1">
                  Meus Dados &amp; Privacidade
                </Link>
              </li>
              <li>
                <Link href="/pedidos" className="text-gray-600 hover:text-amber-700 transition-colors text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 rounded px-1">
                  Meus Pedidos
                </Link>
              </li>
              <li>
                <Link href="/checkout" className="text-gray-600 hover:text-amber-700 transition-colors text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 rounded px-1">
                  Sacola / Checkout
                </Link>
              </li>
            </ul>
          </div>

          {/* Atendimento & Localização */}
          <div>
            <h3 className="text-gray-900 font-black text-sm uppercase tracking-widest mb-6">
              Atendimento
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-gray-700 text-sm">
                <MapPin className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span className="font-semibold">Iacanga - SP e Região</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700 text-sm">
                <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-black text-gray-900">Segunda a Segunda</p>
                  <p className="font-medium text-gray-700">10:00 às 01:30</p>
                </div>
              </li>
              <li className="flex items-center gap-3 text-gray-700 text-sm">
                <Phone className="h-5 w-5 text-amber-600 shrink-0" aria-hidden="true" />
                <span className="font-semibold">(14) 99736-1015</span>
              </li>
              <li className="flex items-center gap-3 text-gray-700 text-sm">
                <Mail className="h-5 w-5 text-amber-600 shrink-0" aria-hidden="true" />
                <span className="font-semibold">DPO: maraysis9010@gmail.com</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Quadro Corporativo e LGPD Conforme Legislação (Decreto 7.962/2013 e LGPD) */}
        <div className="border-t border-gray-200 py-6 text-xs text-gray-700 bg-gray-50/60 rounded-xl px-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="font-bold text-gray-900 mb-1">Dados da Empresa Controladora (Art. 2º do Decreto 7.962/2013):</p>
              <p className="leading-relaxed">
                Nome Fantasia: <span className="font-semibold text-gray-900">BatataTop Delivery</span><br />
                Razão Social: <span className="font-semibold text-gray-900">66.599.795 QUEILA LAIS MARQUES DA SILVA</span><br />
                CNPJ: <span className="font-semibold text-gray-900">66.599.795/0001-04</span><br />
                Endereço: <span className="font-semibold text-gray-900">Rua Carlos Roberto Crepaldi, 120, Sala, Jardim Alvorada, Iacanga - SP, CEP 17187-074</span>
              </p>
            </div>
            <div>
              <p className="font-bold text-gray-900 mb-1">Privacidade e Proteção de Dados (Art. 41 LGPD):</p>
              <p className="leading-relaxed">
                Encarregada pelo Tratamento de Dados (DPO): <span className="font-semibold text-gray-900">Maraysis Pontes Baraldo</span><br />
                Canal Oficial do DPO: <a href="mailto:maraysis9010@gmail.com" className="font-semibold text-amber-800 underline hover:text-amber-950 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-600 rounded">maraysis9010@gmail.com</a><br />
                Prazo para resposta a solicitações do titular: até 15 dias úteis (Art. 19, II LGPD).
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé Inferior: Links Legais e Copyright */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8 grayscale opacity-70 flex-shrink-0">
                <Image
                  src="/logo.png"
                  alt="Batata Top"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="text-xs text-gray-600 font-semibold">
                © {new Date().getFullYear()} BATATA TOP DELIVERY. TODOS OS DIREITOS RESERVADOS.
              </div>
            </div>

            <nav aria-label="Links jurídicos" className="flex items-center gap-4 sm:gap-6 flex-wrap">
              <Link href="/termos" className="text-xs text-gray-700 hover:text-gray-950 font-bold transition-colors uppercase tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 rounded px-1">
                Termos de Uso
              </Link>
              <Link href="/privacidade" className="text-xs text-gray-700 hover:text-gray-950 font-bold transition-colors uppercase tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 rounded px-1">
                Privacidade
              </Link>
              <Link href="/reembolso" className="text-xs text-gray-700 hover:text-gray-950 font-bold transition-colors uppercase tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 rounded px-1">
                Reembolso &amp; CDC
              </Link>
              <Link href="/excluir-conta" className="text-xs text-gray-700 hover:text-gray-950 font-bold transition-colors uppercase tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 rounded px-1">
                Excluir Conta
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  )
}
