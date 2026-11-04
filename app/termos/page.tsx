"use client"

import Link from "next/link"
import Image from "next/image"
import { 
  FileCheck, 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  UserCheck, 
  ShoppingBag, 
  CreditCard, 
  AlertCircle, 
  ShieldAlert, 
  Lock, 
  MessageCircle, 
  Mail, 
  Phone,
  Scale,
  RotateCcw
} from "lucide-react"

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F1B16] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 antialiased selection:bg-[#E3A008] selection:text-white">
      {/* Botão de Retorno */}
      <div className="max-w-3xl w-full mx-auto mb-4">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm font-bold text-[#4B453F] hover:text-[#1F1B16] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309] rounded-lg px-2 py-1"
          aria-label="Voltar para a página inicial"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Voltar para o Início
        </Link>
      </div>

      <main className="w-full max-w-3xl mx-auto my-auto" role="main">
        <div className="bg-white rounded-2xl shadow-lg border border-[#E8E2D9] p-6 sm:p-12 transition-all">
          
          {/* Cabeçalho */}
          <header className="text-center mb-10 pb-8 border-b border-[#E8E2D9]">
            <Link 
              href="/" 
              className="inline-block relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309] rounded-full"
              aria-label="Ir para a página inicial da Batata Top"
            >
              <Image
                src="/logo.png"
                alt="Batata Top Delivery"
                fill
                className="object-contain"
                priority
              />
            </Link>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-[#1F1B16] tracking-tight">
              Termos e Condições Gerais de Uso
            </h1>
            <p className="text-xs font-bold text-[#B45309] uppercase tracking-wider mt-1.5">
              BatataTop Delivery • 66.599.795 QUEILA LAIS MARQUES DA SILVA • CNPJ: 66.599.795/0001-04
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-xs text-[#4B453F] font-semibold">
              <span className="inline-flex items-center gap-1.5 bg-[#F7F4EF] px-3 py-1.5 rounded-full border border-[#E8E2D9]">
                <Calendar className="w-3.5 h-3.5 text-[#B45309]" aria-hidden="true" />
                Vigência: Atualizado em 4 de novembro de 2026
              </span>
              <span className="inline-flex items-center gap-1.5 bg-[#F7F4EF] px-3 py-1.5 rounded-full border border-[#E8E2D9]">
                <MapPin className="w-3.5 h-3.5 text-[#B45309]" aria-hidden="true" />
                Comarca: Iacanga - SP
              </span>
            </div>
          </header>

          {/* Conteúdo dos Termos */}
          <div className="space-y-10 text-sm leading-relaxed text-[#4B453F]">

            {/* 1. Objeto e Aceitação */}
            <section className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#B45309] border border-[#E8E2D9]" aria-hidden="true">
                  <FileCheck className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[#1F1B16]">
                  1. Objeto, Qualificação e Aceitação dos Termos
                </h2>
              </div>
              <p>
                Estes Termos regulam os serviços e o acesso à plataforma eletrônica (web sob o domínio <strong>batatatopiacanga.com.br</strong> e aplicativo mobile) fornecida por <strong>66.599.795 QUEILA LAIS MARQUES DA SILVA</strong>, inscrita no CNPJ sob o nº <strong>66.599.795/0001-04</strong>, com sede na <strong>Rua Carlos Roberto Crepaldi, 120, Sala, Jardim Alvorada, Iacanga - SP, CEP 17187-074</strong>, doravante denominada simplesmente "BatataTop Delivery".
              </p>
              <p>
                Ao cadastrar-se, navegar ou concluir compras pela plataforma, você declara ser civilmente capaz segundo as leis brasileiras e anui expressamente com a totalidade das cláusulas dispostas neste instrumento.
              </p>
            </section>

            {/* 2. Cadastro e Responsabilidade do Usuário */}
            <section className="space-y-3 pt-6 border-t border-[#E8E2D9]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#B45309] border border-[#E8E2D9]" aria-hidden="true">
                  <UserCheck className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[#1F1B16]">
                  2. Cadastro, Segurança e Deveres do Usuário
                </h2>
              </div>
              <ul className="list-disc pl-5 space-y-2 marker:text-[#B45309]">
                <li><strong className="text-[#1F1B16]">Exatidão Cadastral:</strong> O usuário compromete-se a fornecer dados verídicos, completos e atualizados (nome, telefone de contato ativo e endereço com número e referências precisas).</li>
                <li><strong className="text-[#1F1B16]">Guarda de Credenciais:</strong> A senha de acesso é pessoal e intransferível. O titular é exclusivamente responsável por atividades executadas sob seu login.</li>
                <li><strong className="text-[#1F1B16]">Uso de Boa-fé:</strong> É vedada a utilização fraudulenta de cupons promocionais, criação de múltiplas contas para burlar regras de desconto ou fornecimento doloso de dados inverídicos.</li>
              </ul>
            </section>

            {/* 3. Pedidos, Entrega e Horários */}
            <section className="space-y-3 pt-6 border-t border-[#E8E2D9]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#B45309] border border-[#E8E2D9]" aria-hidden="true">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[#1F1B16]">
                  3. Pedidos, Modalidades de Entrega e Retirada
                </h2>
              </div>
              <ul className="list-disc pl-5 space-y-2 marker:text-[#B45309]">
                <li><strong className="text-[#1F1B16]">Delivery:</strong> A entrega é efetuada no perímetro atendido de Iacanga-SP. O cliente deve se atentar ao telefone informado e manter-se receptivo para atender o entregador no endereço cadastrado.</li>
                <li><strong className="text-[#1F1B16]">Retirada no Balcão:</strong> Quando selecionada essa opção, a refeição deverá ser retirada no balcão da loja assim que sinalizado o status de "Pronto para Retirada".</li>
                <li><strong className="text-[#1F1B16]">Ausência de Recebedor:</strong> Em virtude do perecimento imediato de alimentos quentes, caso o entregador permaneça no local de entrega e esgote os meios de contato (telefone/campainha) sem retorno do cliente em até 10 minutos, o pedido poderá ser retornado e descartado sem estorno.</li>
              </ul>
            </section>

            {/* 4. Pagamentos, Cupons e Transações */}
            <section className="space-y-3 pt-6 border-t border-[#E8E2D9]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#B45309] border border-[#E8E2D9]" aria-hidden="true">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[#1F1B16]">
                  4. Preços, Taxas e Transações Financeiras
                </h2>
              </div>
              <ul className="list-disc pl-5 space-y-2 marker:text-[#B45309]">
                <li><strong className="text-[#1F1B16]">Transparência Total:</strong> O valor total, contemplando preço dos itens, opcionais, adicionais, descontos aplicados e taxa de entrega, é exibido detalhadamente antes da finalização.</li>
                <li><strong className="text-[#1F1B16]">Intermediação Segura:</strong> Operações com PIX e Cartões de Crédito ou Débito são operadas diretamente em ambiente seguro pelo Mercado Pago. O Batata Top não armazena dados de cartão do usuário.</li>
              </ul>
            </section>

            {/* 5. Cancelamento, Troca e Reembolso */}
            <section className="space-y-3 pt-6 border-t border-[#E8E2D9]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#B45309] border border-[#E8E2D9]" aria-hidden="true">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[#1F1B16]">
                  5. Cancelamentos, Reembolsos e Direito de Arrependimento
                </h2>
              </div>
              <p>
                As normas que disciplinam cancelamento e estorno obedecem ao Código de Defesa do Consumidor e encontram-se descritas integralmente em nossa{" "}
                <Link href="/reembolso" className="font-bold underline text-[#1F1B16] hover:text-[#C1440E] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B45309] rounded">
                  Política de Reembolso e Cancelamento
                </Link>.
              </p>
            </section>

            {/* 6. Limitação de Responsabilidade */}
            <section className="space-y-3 pt-6 border-t border-[#E8E2D9]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#B45309] border border-[#E8E2D9]" aria-hidden="true">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[#1F1B16]">
                  6. Limitações de Responsabilidade e Disponibilidade
                </h2>
              </div>
              <ul className="list-disc pl-5 space-y-2 marker:text-[#B45309]">
                <li>O Batata Top empenha os melhores esforços técnicos para estabilidade contínua, porém não se responsabiliza por interrupções temporárias decorrentes de falhas em operadoras de telecomunicação, servidores externos ou casos fortuitos/força maior.</li>
                <li>A empresa responde estritamente pela qualidade, higiene e conformidade sanitária dos alimentos por ela confeccionados e entregues por sua equipe ou parceiros credenciados.</li>
              </ul>
            </section>

            {/* 7. Proteção de Dados (LGPD) */}
            <section className="space-y-3 pt-6 border-t border-[#E8E2D9]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#B45309] border border-[#E8E2D9]" aria-hidden="true">
                  <Lock className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[#1F1B16]">
                  7. Proteção de Dados e Privacidade
                </h2>
              </div>
              <p>
                O tratamento de dados coletados opera sob a égide da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), regulado por nossa{" "}
                <Link href="/privacidade" className="font-bold underline text-[#1F1B16] hover:text-[#C1440E] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B45309] rounded">
                  Política de Privacidade
                </Link>.
              </p>
            </section>

            {/* 8. Foro e Legislação Aplicável */}
            <section className="space-y-3 pt-6 border-t border-[#E8E2D9]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#B45309] border border-[#E8E2D9]" aria-hidden="true">
                  <Scale className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[#1F1B16]">
                  8. Legislação Aplicável e Foro de Eleição
                </h2>
              </div>
              <p>
                Estes Termos são regidos pelas leis da República Federativa do Brasil. Para dirimir quaisquer litígios decorrentes deste instrumento, fica eleito o <strong>Foro da Comarca de Iacanga - Estado de São Paulo</strong>, ressalvado expressamente ao consumidor o direito inalienável de optar pelo foro de seu próprio domicílio residencial, nos estritos termos do Artigo 101, Inciso I, da Lei Federal nº 8.078/1990 (Código de Defesa do Consumidor).
              </p>
            </section>

            {/* 9. Atendimento e Suporte */}
            <section className="space-y-3 pt-6 border-t border-[#E8E2D9]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#F7F4EF] text-[#B45309] border border-[#E8E2D9]" aria-hidden="true">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[#1F1B16]">
                  9. Contato e Canais de Atendimento
                </h2>
              </div>
              <div className="p-4 rounded-xl bg-[#FAFAF8] border border-[#E8E2D9] space-y-2.5 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#B45309] shrink-0" aria-hidden="true" />
                  <div>
                    <strong className="text-[#1F1B16]">WhatsApp oficial:</strong>{" "}
                    <a href="https://wa.me/5514997361015" target="_blank" rel="noopener noreferrer" className="font-bold text-[#1F1B16] underline hover:text-[#C1440E] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B45309] rounded">
                      (14) 99736-1015
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#B45309] shrink-0" aria-hidden="true" />
                  <div>
                    <strong className="text-[#1F1B16]">E-mail oficial:</strong>{" "}
                    <a href="mailto:maraysis9010@gmail.com" className="font-bold text-[#1F1B16] underline hover:text-[#C1440E] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B45309] rounded">
                      maraysis9010@gmail.com
                    </a>
                  </div>
                </div>
              </div>
            </section>

          </div>

        </div>
      </main>

      {/* Rodapé */}
      <footer className="text-center text-xs text-[#4B453F] py-6 space-y-2 max-w-3xl mx-auto w-full" role="contentinfo">
        <div className="flex justify-center items-center gap-4 font-semibold flex-wrap">
          <Link href="/privacidade" className="hover:text-[#1F1B16] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B45309] rounded px-1">
            Política de Privacidade
          </Link>
          <span aria-hidden="true">•</span>
          <Link href="/termos" className="text-[#1F1B16] font-bold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B45309] rounded px-1">
            Termos de Uso
          </Link>
          <span aria-hidden="true">•</span>
          <Link href="/reembolso" className="hover:text-[#1F1B16] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B45309] rounded px-1">
            Política de Reembolso
          </Link>
          <span aria-hidden="true">•</span>
          <Link href="/excluir-conta" className="hover:text-[#1F1B16] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B45309] rounded px-1">
            Excluir Conta
          </Link>
        </div>
        <p>© {new Date().getFullYear()} 66.599.795 QUEILA LAIS MARQUES DA SILVA • CNPJ: 66.599.795/0001-04 • Rua Carlos Roberto Crepaldi, 120, Sala, Jardim Alvorada, Iacanga - SP, CEP 17187-074</p>
        <p className="text-[11px] text-[#6B635B]">Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}
